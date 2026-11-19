import { TestBed } from '@angular/core/testing';
import { Markdown, parseInline, parseMarkdown, plainText } from './markdown';

describe('parseMarkdown', () => {
  it('parses headings, lists, paragraphs and inline styles', () => {
    const blocks = parseMarkdown(
      '### Plan\nPousse le **Pack Barista** cette semaine.\n\n- Relance *vite*\n- Vérifie `get_kpis`\n\n1. Un\n2. Deux',
    );
    expect(blocks.map((b) => b.kind)).toEqual(['h', 'p', 'ul', 'ol']);
    expect(blocks[1]).toEqual({
      kind: 'p',
      inline: [{ text: 'Pousse le ' }, { text: 'Pack Barista', bold: true }, { text: ' cette semaine.' }],
    });
    const ul = blocks[2] as { kind: 'ul'; items: unknown[][] };
    expect(ul.items).toHaveLength(2);
    expect(parseInline('Vérifie `get_kpis`')[1]).toEqual({ text: 'get_kpis', code: true });
  });

  it('keeps raw HTML as text (never interpreted)', () => {
    const fixture = TestBed.createComponent(Markdown);
    fixture.componentRef.setInput('text', 'Salut <img src=x onerror=alert(1)> **ok**');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(el.querySelector('strong')?.textContent).toBe('ok');
  });

  it('builds a plain-text preview', () => {
    expect(plainText('### 3 idées\n- Avant/après du **bureau**\n- Unboxing *ASMR*')).toBe(
      '3 idées · Avant/après du bureau · Unboxing ASMR',
    );
  });
});
