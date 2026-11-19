import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Mini-courbe d'une carte KPI : trait de dé-emphase (gris), dernier point en couleur d'accent. Décorative : la
 * valeur et la variation sont écrites dans la carte, le détail est dans les graphiques.
 */
@Component({
  selector: 'sc-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-9', 'aria-hidden': 'true' },
  template: `
    @if (geometry(); as g) {
      <svg
        viewBox="0 0 100 36"
        preserveAspectRatio="none"
        class="block h-full w-full overflow-visible"
      >
        <path [attr.d]="g.area" style="fill: var(--chart-wash)" />
        <path
          [attr.d]="g.line"
          fill="none"
          style="stroke: var(--chart-muted)"
          stroke-width="1.5"
          vector-effect="non-scaling-stroke"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </svg>
      <span
        class="absolute size-2 -translate-1/2 rounded-pill ring-2 ring-surface-raised"
        style="background: var(--chart-accent)"
        [style.left.%]="g.lastX"
        [style.top.%]="(g.lastY / 36) * 100"
      ></span>
    }
  `,
  styles: `
    :host {
      position: relative;
    }
  `,
})
export class Sparkline {
  readonly values = input.required<number[]>();

  protected readonly geometry = computed(() => {
    const v = this.values();
    if (v.length < 2) return null;
    const max = Math.max(...v);
    const min = Math.min(0, ...v);
    const span = max - min || 1;
    const pts = v.map(
      (n, i) => [(i / (v.length - 1)) * 100, 33 - ((n - min) / span) * 30] as const,
    );
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('');
    return {
      line,
      area: `${line}L100,36L0,36Z`,
      lastX: pts[pts.length - 1][0],
      lastY: pts[pts.length - 1][1],
    };
  });
}
