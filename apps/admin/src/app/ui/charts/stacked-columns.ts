import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { axisLabel, hostWidth, labelStride, niceTicks, topRoundedRect } from './chart-utils';

export interface StackSeries {
  key: string;
  label: string;
  /** Couleur CSS du segment (token : `var(--success)`…). */
  color: string;
}

export interface StackColumn {
  label: string;
  long: string;
  /** Valeurs par `StackSeries.key`. */
  values: Record<string, number>;
}

/**
 * Colonnes empilées (≤ 24px, écart de 2px couleur de surface entre segments, bout arrondi 4px en haut, base carrée).
 * Chaque colonne est sa propre cible de survol/focus (infobulle : toutes les séries + total).
 */
@Component({
  selector: 'sc-stacked-columns',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative select-none' },
  template: `
    <div
      class="relative rounded-sm outline-offset-4"
      tabindex="0"
      role="group"
      aria-roledescription="graphique"
      [attr.aria-label]="summary() + ' Flèches gauche et droite pour parcourir les colonnes.'"
      (keydown)="onKey($event)"
      (focus)="active() === null && columns().length && active.set(columns().length - 1)"
      (blur)="active.set(null)"
    >
      <svg
        [attr.width]="width()"
        [attr.height]="height()"
        class="block overflow-visible"
        aria-hidden="true"
      >
        @for (t of ticks(); track t.v) {
          <line
            [attr.x1]="m.l"
            [attr.x2]="width() - m.r"
            [attr.y1]="t.y"
            [attr.y2]="t.y"
            style="stroke: var(--chart-grid)"
            stroke-width="1"
            aria-hidden="true"
          />
          <text
            [attr.x]="m.l - 8"
            [attr.y]="t.y"
            dy="0.32em"
            text-anchor="end"
            class="text-xs tabular-nums"
            style="fill: var(--ink-muted)"
          >
            {{ t.label }}
          </text>
        }
        @for (c of layout(); track c.i) {
          <g (pointerenter)="active.set(c.i)" (pointerleave)="active.set(null)">
            <!-- Cible de survol : toute la largeur du créneau, plus large que la colonne. -->
            <rect
              [attr.x]="c.slotX"
              [attr.y]="m.t"
              [attr.width]="c.slotW"
              [attr.height]="baseY() - m.t"
              rx="6"
              [style.fill]="active() === c.i ? 'var(--surface-sunken)' : 'transparent'"
            />
            @for (s of c.segments; track s.key) {
              <path [attr.d]="s.d" [style.fill]="s.color" />
            }
          </g>
        }
        <line
          [attr.x1]="m.l"
          [attr.x2]="width() - m.r"
          [attr.y1]="baseY()"
          [attr.y2]="baseY()"
          style="stroke: var(--chart-axis)"
          stroke-width="1"
        />
        @for (c of layout(); track c.i) {
          @if (c.showLabel) {
            <text
              [attr.x]="c.cx"
              [attr.y]="baseY() + 18"
              text-anchor="middle"
              class="text-xs"
              style="fill: var(--ink-muted)"
            >
              {{ c.label }}
            </text>
          }
        }
      </svg>

      @if (tip(); as t) {
        <div
          class="pointer-events-none absolute top-0 z-10 min-w-44 rounded-md bg-surface-raised px-3 py-2.5 text-sm shadow-lift ring-1 ring-line"
          [style.left.px]="t.left"
          [style.transform]="t.flip ? 'translateX(-100%)' : null"
          aria-hidden="true"
        >
          <p class="m-0 mb-1.5 text-xs font-bold text-ink-muted">{{ t.long }}</p>
          @for (r of t.rows; track r.key) {
            <p class="m-0 mt-0.5 flex items-center gap-2">
              <span class="size-2.5 rounded-[3px]" [style.background]="r.color"></span>
              <strong class="min-w-6 font-extrabold text-ink tabular-nums">{{ r.value }}</strong>
              <span class="text-ink-muted">{{ r.label }}</span>
            </p>
          }
          <p class="m-0 mt-1.5 border-t border-line pt-1.5 text-xs font-bold text-ink-muted">
            Total : {{ t.total }}
          </p>
        </div>
      }
    </div>
    <p class="sc-sr" aria-live="polite">{{ announcement() }}</p>
  `,
})
export class StackedColumns {
  readonly series = input.required<StackSeries[]>();
  readonly columns = input.required<StackColumn[]>();
  readonly unit = input('commandes');
  readonly height = input(220);
  /** Résumé lu par les lecteurs d'écran (le tableau donne le détail). */
  readonly summary = input('');

  protected readonly width = hostWidth();
  protected readonly active = signal<number | null>(null);
  protected readonly m = { t: 12, r: 8, b: 28, l: 40 };

  protected readonly baseY = computed(() => this.height() - this.m.b);
  private readonly plotW = computed(() => Math.max(10, this.width() - this.m.l - this.m.r));

  private readonly scale = computed(() => {
    const keys = this.series().map((s) => s.key);
    const max = Math.max(
      0,
      ...this.columns().map((c) => keys.reduce((sum, k) => sum + (c.values[k] ?? 0), 0)),
    );
    const ticks = niceTicks(max);
    return { ticks, top: ticks[ticks.length - 1] || 1 };
  });

  protected readonly ticks = computed(() =>
    this.scale().ticks.map((v) => ({
      v,
      y: this.baseY() - (v / this.scale().top) * (this.baseY() - this.m.t),
      label: axisLabel(v),
    })),
  );

  protected readonly layout = computed(() => {
    const cols = this.columns();
    const n = Math.max(1, cols.length);
    const slotW = this.plotW() / n;
    const barW = Math.max(2, Math.min(24, slotW * 0.62));
    const plotH = this.baseY() - this.m.t;
    const top = this.scale().top;
    const stride = labelStride(cols.length, this.plotW(), 48);
    const gap = barW >= 6 ? 2 : 0;
    return cols.map((c, i) => {
      const slotX = this.m.l + i * slotW;
      const cx = slotX + slotW / 2;
      const x = cx - barW / 2;
      let y = this.baseY();
      const visible = this.series().filter((s) => (c.values[s.key] ?? 0) > 0);
      const segments = visible.map((s, j) => {
        const h = ((c.values[s.key] ?? 0) / top) * plotH;
        const segTop = y - h;
        y = segTop;
        // Écart de 2px (couleur de surface) sous chaque segment sauf le premier : la base reste sur l'axe.
        const segH = j === 0 ? h : Math.max(0.5, h - gap);
        const d =
          j === visible.length - 1
            ? topRoundedRect(x, segTop, barW, segH, 4)
            : `M${x},${segTop}h${barW}v${segH}h${-barW}Z`;
        return { key: s.key, color: s.color, d };
      });
      const total = this.series().reduce((sum, s) => sum + (c.values[s.key] ?? 0), 0);
      const parts = this.series()
        .map((s) => `${s.label} ${c.values[s.key] ?? 0}`)
        .join(', ');
      return {
        i,
        slotX: slotX + 1,
        slotW: Math.max(1, slotW - 2),
        cx,
        label: c.label,
        showLabel: i % stride === 0,
        segments,
        aria: `${c.long} : ${total} ${this.unit()} (${parts})`,
      };
    });
  });

  protected readonly tip = computed(() => {
    const i = this.active();
    const c = i === null ? null : this.columns()[i];
    const l = i === null ? null : this.layout()[i];
    if (!c || !l) return null;
    const flip = l.cx > this.width() * 0.6;
    return {
      long: c.long,
      left: flip ? l.cx - 18 : l.cx + 18,
      flip,
      total: this.series().reduce((sum, s) => sum + (c.values[s.key] ?? 0), 0),
      rows: [...this.series()]
        .reverse()
        .map((s) => ({ key: s.key, label: s.label, color: s.color, value: c.values[s.key] ?? 0 })),
    };
  });

  protected readonly announcement = computed(() => {
    const i = this.active();
    return i === null ? '' : (this.layout()[i]?.aria ?? '');
  });

  protected onKey(e: KeyboardEvent): void {
    const n = this.columns().length;
    if (!n) return;
    const cur = this.active() ?? n - 1;
    const next =
      e.key === 'ArrowLeft'
        ? Math.max(0, cur - 1)
        : e.key === 'ArrowRight'
          ? Math.min(n - 1, cur + 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null;
    if (e.key === 'Escape') this.active.set(null);
    if (next !== null) {
      e.preventDefault();
      this.active.set(next);
    }
  }
}
