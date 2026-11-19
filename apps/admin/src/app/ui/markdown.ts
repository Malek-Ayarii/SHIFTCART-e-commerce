import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Segment de texte en ligne : gras, italique ou code. */
export interface Inline {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

export type Block =
  | { kind: 'h'; level: 1 | 2 | 3; inline: Inline[] }
  | { kind: 'p'; inline: Inline[] }
  | { kind: 'ul' | 'ol'; items: Inline[][] }
  | { kind: 'quote'; inline: Inline[] }
  | { kind: 'hr' };

/** `**gras**`, `*italique*` / `_italique_`, `` `code` `` → segments (aucun HTML interprété). */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  for (const m of src.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ text: src.slice(last, i) });
    const tok = m[0];
    if (tok.startsWith('**')) out.push({ text: tok.slice(2, -2), bold: true });
    else if (tok.startsWith('`')) out.push({ text: tok.slice(1, -1), code: true });
    else out.push({ text: tok.slice(1, -1), italic: true });
    last = i + tok.length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

/** Markdown simple des agents → blocs. Les tableaux et le HTML brut restent du texte. */
export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: Inline[][] } | null = null;

  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'p', inline: parseInline(para.join(' ')) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push(list);
    list = null;
  };

  for (const raw of src.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      flushList();
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara();
      flushList();
      const level = Math.min(3, h[1].length) as 1 | 2 | 3;
      blocks.push({ kind: 'h', level, inline: parseInline(h[2].replace(/#+$/, '').trim()) });
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushPara();
      flushList();
      blocks.push({ kind: 'hr' });
      continue;
    }
    const ul = /^[-*•]\s+(.*)$/.exec(trimmed);
    const ol = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (ul || ol) {
      flushPara();
      const kind = ul ? 'ul' : 'ol';
      if (!list || list.kind !== kind) {
        flushList();
        list = { kind, items: [] };
      }
      list.items.push(parseInline((ul ?? ol)![1]));
      continue;
    }
    if (trimmed.startsWith('>')) {
      flushPara();
      flushList();
      blocks.push({ kind: 'quote', inline: parseInline(trimmed.replace(/^>\s?/, '')) });
      continue;
    }
    // Ligne de continuation d'un élément de liste (indentée).
    if (list && /^\s{2,}/.test(raw)) {
      const items = (list as { items: Inline[][] }).items;
      items[items.length - 1].push({ text: ' ' }, ...parseInline(trimmed));
      continue;
    }
    flushList();
    para.push(trimmed);
  }
  flushPara();
  flushList();
  return blocks;
}

/** Aperçu en texte brut : sans marques Markdown, lignes jointes par « · ». */
export function plainText(src: string): string {
  return src
    .split('\n')
    .map((l) =>
      l
        .trim()
        .replace(/^#{1,6}\s+/, '')
        .replace(/^([-*•]|\d+[.)])\s+/, '')
        .replace(/^>\s?/, '')
        .replace(/\*\*|`|(?<!\w)[*_](?=\S)|(?<=\S)[*_](?!\w)/g, ''),
    )
    .filter((l) => l && !/^(-{3,}|\*{3,}|_{3,})$/.test(l))
    .join(' · ');
}

/**
 * Markdown — rendu sûr des réponses des agents (titres, listes, gras, italique, code, citations).
 * Construit avec des gabarits Angular : aucun `innerHTML`, aucun lien ni image interprétés.
 */
@Component({
  selector: 'sc-markdown',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0 text-body text-ink [overflow-wrap:anywhere]' },
  template: `
    <ng-template #inl let-segs>
      @for (s of segs; track $index) {
        @if (s.code) {
          <code class="px-1.5 py-0.5 rounded-xs bg-surface-sunken font-mono text-[0.9em]">{{ s.text }}</code>
        } @else if (s.bold) {
          <strong class="font-extrabold">{{ s.text }}</strong>
        } @else if (s.italic) {
          <em>{{ s.text }}</em>
        } @else {
          {{ s.text }}
        }
      }
    </ng-template>

    <div class="flex flex-col gap-3">
      @for (b of blocks(); track $index) {
        @switch (b.kind) {
          @case ('h') {
            <p
              class="m-0 font-display font-extrabold text-ink"
              [class]="b.level === 1 ? 'text-heading' : b.level === 2 ? 'text-title text-[17px]' : 'text-title'"
              role="heading"
              [attr.aria-level]="b.level + 2"
            >
              <ng-container *ngTemplateOutlet="inl; context: { $implicit: b.inline }" />
            </p>
          }
          @case ('p') {
            <p class="m-0"><ng-container *ngTemplateOutlet="inl; context: { $implicit: b.inline }" /></p>
          }
          @case ('ul') {
            <ul class="m-0 pl-0 list-none flex flex-col gap-1.5">
              @for (it of b.items; track $index) {
                <li class="relative pl-5 before:absolute before:left-1 before:top-[0.6em] before:size-1.5 before:rounded-pill before:bg-ink before:content-['']">
                  <ng-container *ngTemplateOutlet="inl; context: { $implicit: it }" />
                </li>
              }
            </ul>
          }
          @case ('ol') {
            <ol class="m-0 pl-0 list-none flex flex-col gap-1.5 [counter-reset:sc-ol]">
              @for (it of b.items; track $index) {
                <li class="relative pl-7 [counter-increment:sc-ol] before:absolute before:left-0 before:top-0 before:font-extrabold before:text-orange-ink before:content-[counter(sc-ol)'.']">
                  <ng-container *ngTemplateOutlet="inl; context: { $implicit: it }" />
                </li>
              }
            </ol>
          }
          @case ('quote') {
            <blockquote class="m-0 pl-3 border-l-[3px] border-line-strong text-ink-muted">
              <ng-container *ngTemplateOutlet="inl; context: { $implicit: b.inline }" />
            </blockquote>
          }
          @case ('hr') {
            <hr class="m-0 border-0 border-t border-line" />
          }
        }
      }
    </div>
  `,
})
export class Markdown {
  readonly text = input('');
  protected readonly blocks = computed(() => parseMarkdown(this.text()));
}
