import { DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';
import { THIN_SPACE, formatNumber } from '../../core/format';

/**
 * Graduations « rondes » de 0 à au moins `max` (1, 2, 2,5 ou 5 × 10ⁿ), `target` intervalles environ.
 * `max` ≤ 0 → [0, 1] pour garder un axe lisible sur une période vide.
 */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let v = 0; v < max + step * 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Graduation d'axe : entier en clair sous 10 000, compact au-delà (12 k, 1,2 M). */
export function axisLabel(v: number): string {
  if (Math.abs(v) >= 1_000_000) return formatNumber(v / 1_000_000, 1) + THIN_SPACE + 'M';
  if (Math.abs(v) >= 10_000) return formatNumber(v / 1000, 1) + THIN_SPACE + 'k';
  return formatNumber(v, 1);
}

/** Largeur (px) de l'élément hôte, suivie au redimensionnement ; `fallback` tant qu'elle est inconnue (SSR, jsdom). */
export function hostWidth(fallback = 640) {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const width = signal(fallback);
  const destroyRef = inject(DestroyRef);
  afterNextRender(() => {
    const el = host.nativeElement;
    const read = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) width.set(w);
    };
    read();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    destroyRef.onDestroy(() => ro.disconnect());
  });
  return width;
}

/**
 * Rectangle aux coins du haut arrondis (rayon `r`), base carrée : bout de donnée arrondi, ancré à la ligne de base.
 */
export function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
  if (h <= 0 || w <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return (
    `M${x},${y + h}V${y + rr}` +
    `Q${x},${y} ${x + rr},${y}` +
    `H${x + w - rr}` +
    `Q${x + w},${y} ${x + w},${y + rr}` +
    `V${y + h}Z`
  );
}

/** Indices d'étiquettes d'axe X à afficher pour qu'elles ne se chevauchent pas (première et dernière gardées si possible). */
export function labelStride(count: number, plotWidth: number, minGap = 56): number {
  if (count <= 1) return 1;
  const fit = Math.max(1, Math.floor(plotWidth / minGap));
  return Math.max(1, Math.ceil(count / fit));
}
