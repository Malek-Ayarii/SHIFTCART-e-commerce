import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { axisLabel, hostWidth, labelStride, niceTicks } from './chart-utils';

export interface TrendPoint {
  /** Étiquette d'axe courte (« 3 nov. »). */
  label: string;
  /** Libellé complet (infobulle). */
  long: string;
  /** null = tranche à venir (la courbe courante s'arrête avant). */
  value: number | null;
  /** Même tranche de la période précédente (null si absente). */
  previous: number | null;
  previousLong?: string;
}

/**
 * Courbe de tendance : période courante (aire + trait 2px, couleur d'accent) contre la période précédente (trait
 * gris). Un seul axe Y. Réticule + infobulle au survol, flèches ← → au clavier (mêmes infos), annonce en direct.
 */
@Component({
  selector: 'sc-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative select-none' },
  template: `
    <div
      class="relative rounded-sm outline-offset-4"
      tabindex="0"
      role="group"
      [attr.aria-label]="ariaLabel()"
      aria-roledescription="graphique"
      (keydown)="onKey($event)"
      (focus)="active() === null && points().length && active.set(points().length - 1)"
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
        <line
          [attr.x1]="m.l"
          [attr.x2]="width() - m.r"
          [attr.y1]="baseY()"
          [attr.y2]="baseY()"
          style="stroke: var(--chart-axis)"
          stroke-width="1"
        />
        @for (x of xLabels(); track x.i) {
          <text
            [attr.x]="x.x"
            [attr.y]="baseY() + 18"
            [attr.text-anchor]="x.anchor"
            class="text-xs"
            style="fill: var(--ink-muted)"
          >
            {{ x.label }}
          </text>
        }

        @if (previousPath()) {
          <path
            [attr.d]="previousPath()"
            fill="none"
            style="stroke: var(--chart-muted)"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
        }
        <path [attr.d]="areaPath()" style="fill: var(--chart-wash)" />
        <path
          [attr.d]="linePath()"
          fill="none"
          style="stroke: var(--chart-accent)"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        @if (activePoint(); as p) {
          <line
            [attr.x1]="p.x"
            [attr.x2]="p.x"
            [attr.y1]="m.t"
            [attr.y2]="baseY()"
            style="stroke: var(--chart-axis)"
            stroke-width="1"
          />
          @if (p.py !== null) {
            <circle
              [attr.cx]="p.x"
              [attr.cy]="p.py"
              r="4"
              style="fill: var(--chart-muted); stroke: var(--surface-raised)"
              stroke-width="2"
            />
          }
          @if (p.y !== null) {
            <circle
              [attr.cx]="p.x"
              [attr.cy]="p.y"
              r="5"
              style="fill: var(--chart-accent); stroke: var(--surface-raised)"
              stroke-width="2"
            />
          }
        } @else if (lastPoint(); as p) {
          <circle
            [attr.cx]="p.x"
            [attr.cy]="p.y"
            r="4"
            style="fill: var(--chart-accent); stroke: var(--surface-raised)"
            stroke-width="2"
          />
        }

        <rect
          [attr.x]="m.l"
          [attr.y]="0"
          [attr.width]="plotW()"
          [attr.height]="height()"
          fill="transparent"
          (pointermove)="onPointer($event)"
          (pointerleave)="active.set(null)"
        />
      </svg>

      @if (activePoint(); as p) {
        <div
          class="pointer-events-none absolute top-0 z-10 min-w-44 rounded-md bg-surface-raised px-3 py-2.5 text-sm shadow-lift ring-1 ring-line"
          [style.left.px]="p.tipLeft"
          [style.transform]="p.tipFlip ? 'translateX(-100%)' : null"
        >
          <p class="m-0 mb-1.5 text-xs font-bold text-ink-muted">{{ p.point.long }}</p>
          @if (p.point.value !== null) {
            <p class="m-0 flex items-center gap-2">
              <span
                class="h-0.5 w-3 rounded-pill"
                style="background: var(--chart-accent)"
                aria-hidden="true"
              ></span>
              <strong class="font-extrabold text-ink">{{ format()(p.point.value) }}</strong>
              <span class="text-ink-muted">{{ valueName() }}</span>
            </p>
          } @else {
            <p class="m-0 text-ink-muted">À venir</p>
          }
          @if (p.point.previous !== null) {
            <p class="m-0 mt-1 flex items-center gap-2">
              <span
                class="h-0.5 w-3 rounded-pill"
                style="background: var(--chart-muted)"
                aria-hidden="true"
              ></span>
              <strong class="font-extrabold text-ink">{{ format()(p.point.previous) }}</strong>
              <span class="text-ink-muted">{{ p.point.previousLong ?? previousName() }}</span>
            </p>
          }
        </div>
      }
    </div>
    <p class="sc-sr" aria-live="polite">{{ announcement() }}</p>
  `,
})
export class TrendChart {
  readonly points = input.required<TrendPoint[]>();
  readonly format = input<(v: number) => string>((v) => String(v));
  readonly valueName = input('période');
  readonly previousName = input('période précédente');
  readonly height = input(260);
  /** Résumé lu par les lecteurs d'écran (le tableau donne le détail). */
  readonly summary = input('');

  protected readonly width = hostWidth();
  protected readonly active = signal<number | null>(null);

  /** Marges : gauche selon la graduation la plus longue. */
  protected readonly m = { t: 12, r: 12, b: 28, l: 48 };

  private readonly scale = computed(() => {
    const max = Math.max(0, ...this.points().flatMap((p) => [p.value ?? 0, p.previous ?? 0]));
    const ticks = niceTicks(max);
    return { ticks, top: ticks[ticks.length - 1] || 1 };
  });

  protected readonly plotW = computed(() => Math.max(10, this.width() - this.m.l - this.m.r));
  protected readonly baseY = computed(() => this.height() - this.m.b);
  private readonly plotH = computed(() => this.baseY() - this.m.t);

  private x(i: number): number {
    const n = this.points().length;
    return n <= 1 ? this.m.l + this.plotW() / 2 : this.m.l + (i * this.plotW()) / (n - 1);
  }
  private y(v: number): number {
    return this.baseY() - (v / this.scale().top) * this.plotH();
  }

  protected readonly ticks = computed(() =>
    this.scale().ticks.map((v) => ({ v, y: this.y(v), label: axisLabel(v) })),
  );

  protected readonly xLabels = computed(() => {
    const pts = this.points();
    const stride = labelStride(pts.length, this.plotW());
    const out: { i: number; x: number; label: string; anchor: string }[] = [];
    pts.forEach((p, i) => {
      if (i % stride !== 0) return;
      const anchor =
        pts.length === 1 ? 'middle' : i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle';
      out.push({ i, x: this.x(i), label: p.label, anchor });
    });
    return out;
  });

  /** Indices tracés de la période courante : de 0 jusqu'à la dernière tranche passée. */
  private readonly drawn = computed(() => {
    const pts = this.points();
    let last = -1;
    pts.forEach((p, i) => {
      if (p.value !== null) last = i;
    });
    return last;
  });

  protected readonly linePath = computed(() => {
    const pts = this.points();
    let d = '';
    for (let i = 0; i <= this.drawn(); i++) {
      d += `${i ? 'L' : 'M'}${this.x(i).toFixed(1)},${this.y(pts[i].value ?? 0).toFixed(1)}`;
    }
    return d;
  });

  protected readonly areaPath = computed(() => {
    const last = this.drawn();
    if (last < 0) return '';
    return `${this.linePath()}L${this.x(last).toFixed(1)},${this.baseY()}L${this.x(0).toFixed(1)},${this.baseY()}Z`;
  });

  protected readonly previousPath = computed(() => {
    let d = '';
    let pen = false;
    this.points().forEach((p, i) => {
      if (p.previous === null) {
        pen = false;
        return;
      }
      d += `${pen ? 'L' : 'M'}${this.x(i).toFixed(1)},${this.y(p.previous).toFixed(1)}`;
      pen = true;
    });
    return d;
  });

  protected readonly lastPoint = computed(() => {
    const i = this.drawn();
    if (i < 0) return null;
    return { x: this.x(i), y: this.y(this.points()[i].value ?? 0) };
  });

  protected readonly activePoint = computed(() => {
    const i = this.active();
    const pts = this.points();
    if (i === null || !pts[i]) return null;
    const point = pts[i];
    const x = this.x(i);
    const tipFlip = x > this.width() * 0.6;
    return {
      point,
      x,
      y: point.value === null ? null : this.y(point.value),
      py: point.previous === null ? null : this.y(point.previous),
      tipLeft: tipFlip ? x - 12 : x + 12,
      tipFlip,
    };
  });

  protected readonly announcement = computed(() => {
    const a = this.activePoint();
    if (!a) return '';
    const prev =
      a.point.previous === null
        ? ''
        : `, ${a.point.previousLong ?? this.previousName()} : ${this.format()(a.point.previous)}`;
    const cur = a.point.value === null ? 'à venir' : this.format()(a.point.value);
    return `${a.point.long} : ${cur}${prev}`;
  });

  protected readonly ariaLabel = computed(
    () => `${this.summary()} Flèches gauche et droite pour parcourir les valeurs.`,
  );

  protected onPointer(e: PointerEvent): void {
    const n = this.points().length;
    if (!n) return;
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const rel = e.clientX - rect.left;
    const i = n === 1 ? 0 : Math.round((rel / rect.width) * (n - 1));
    this.active.set(Math.min(n - 1, Math.max(0, i)));
  }

  protected onKey(e: KeyboardEvent): void {
    const n = this.points().length;
    if (!n) return;
    const cur = this.active() ?? n - 1;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'ArrowRight') next = Math.min(n - 1, cur + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === 'Escape') {
      this.active.set(null);
      return;
    }
    if (next !== null) {
      e.preventDefault();
      this.active.set(next);
    }
  }
}
