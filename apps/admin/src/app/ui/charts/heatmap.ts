import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { ISO_WEEKDAYS, ISO_WEEKDAYS_SHORT } from '../../core/period';

/** Teinte séquentielle (une teinte, clair → foncé) : 5 classes d'accent mélangées à la surface. */
const LEVELS = [22, 40, 58, 78, 100];

/**
 * Carte de chaleur jour de la semaine × heure (commandes reçues). Séquentielle mono-teinte avec légende d'échelle ;
 * case vide = surface en creux. Infobulle au survol ; le détail complet est dans la vue tableau de la carte.
 */
@Component({
  selector: 'sc-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block relative' },
  template: `
    <div class="overflow-x-auto pb-1" role="img" [attr.aria-label]="summary()">
      <div
        class="grid min-w-160 grid-cols-[--spacing(10)_repeat(24,minmax(0,1fr))] gap-0.5"
        aria-hidden="true"
      >
        @for (row of grid(); track row.day) {
          <span class="pr-2 text-right text-xs font-semibold leading-6 text-ink-muted">{{
            row.short
          }}</span>
          @for (c of row.cells; track c.hour) {
            <span
              class="h-6 rounded-[3px]"
              [style.outline]="active() === c ? '2px solid var(--ink)' : null"
              [style.background]="c.color"
              (pointerenter)="active.set(c)"
              (pointerleave)="active.set(null)"
            ></span>
          }
        }
        <span></span>
        @for (h of hours; track h) {
          <span class="pt-1 text-xs text-ink-muted tabular-nums">{{
            h % 3 === 0 ? h + ' h' : ''
          }}</span>
        }
      </div>
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
      <p class="m-0 min-h-5 font-semibold" aria-live="polite">
        @if (active(); as c) {
          <strong class="text-ink">{{ c.orders }} commande{{ c.orders > 1 ? 's' : '' }}</strong>
          · {{ c.dayLong }}, {{ c.hour }} h – {{ (c.hour + 1) % 24 }} h
        } @else if (peak(); as p) {
          Pic :
          <strong class="text-ink"
            >{{ p.dayLong }}, {{ p.hour }} h – {{ (p.hour + 1) % 24 }} h</strong
          >
          ({{ p.orders }})
        }
      </p>
      <div class="flex items-center gap-1.5" aria-hidden="true">
        <span>Moins</span>
        <span class="size-3.5 rounded-[3px] bg-surface-sunken"></span>
        @for (l of levels; track l) {
          <span class="size-3.5 rounded-[3px]" [style.background]="levelColor(l)"></span>
        }
        <span>Plus</span>
      </div>
    </div>
  `,
})
export class Heatmap {
  /** Cases non vides (weekday 1 = lundi … 7, hour 0–23). */
  readonly cells = input.required<{ weekday: number; hour: number; orders: number }[]>();
  readonly summary = input('Commandes par jour de la semaine et par heure.');

  protected readonly hours = Array.from({ length: 24 }, (_, h) => h);
  protected readonly levels = LEVELS;
  protected readonly active = signal<HeatCellView | null>(null);

  protected levelColor(pct: number): string {
    return `color-mix(in oklab, var(--chart-accent) ${pct}%, var(--surface-raised))`;
  }

  private readonly max = computed(() => Math.max(0, ...this.cells().map((c) => c.orders)));

  protected readonly grid = computed(() => {
    const byKey = new Map(this.cells().map((c) => [`${c.weekday}-${c.hour}`, c.orders]));
    const max = this.max();
    return ISO_WEEKDAYS_SHORT.map((short, d) => ({
      day: d + 1,
      short,
      cells: this.hours.map((hour): HeatCellView => {
        const orders = byKey.get(`${d + 1}-${hour}`) ?? 0;
        const level =
          orders && max
            ? Math.min(LEVELS.length - 1, Math.ceil((orders / max) * LEVELS.length) - 1)
            : -1;
        return {
          hour,
          orders,
          dayLong: ISO_WEEKDAYS[d],
          color: level < 0 ? 'var(--surface-sunken)' : this.levelColor(LEVELS[level]),
        };
      }),
    }));
  });

  protected readonly peak = computed(() => {
    let best: HeatCellView | null = null;
    for (const row of this.grid())
      for (const c of row.cells) if (c.orders && (!best || c.orders > best.orders)) best = c;
    return best;
  });
}

interface HeatCellView {
  hour: number;
  orders: number;
  dayLong: string;
  color: string;
}
