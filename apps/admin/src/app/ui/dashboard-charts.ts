import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Observable, Subscription, map } from 'rxjs';
import { StatsApi } from '../core/api/stats.api';
import { formatNumber, formatTnd } from '../core/format';
import { ApiOrderStatus, DayStat, GovernorateStat, OrderCounts, ProductStat } from '../core/models';
import { OrderStatus, STATUS_META, toUiStatus } from '../core/status';
import { environment } from '../../environments/environment';
import { DemoBadge } from './demo-badge';
import { Icon } from './icon';

/** Ordre du pipeline COD pour la répartition des statuts. */
const STATUS_ORDER: readonly ApiOrderStatus[] = [
  'NEW',
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
];

/** Gouvernorats affichés avant de regrouper le reste en « Autres ». */
const TOP_GOVERNORATES = 6;

const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** « 2026-11-03 » → « lun. 3 nov. » (date civile, sans fuseau). */
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]} ${d} ${MONTHS[m - 1]}`;
}

/** Plus petit plafond « rond » (1, 2, 5 × 10ⁿ) ≥ v. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

interface BarRow {
  key: string;
  label: string;
  value: string;
  pct: number;
  top?: boolean;
  muted?: boolean;
  /** Regroupement « Autres » : barre en retrait. */
  other?: boolean;
}

/**
 * DashboardCharts — 4 graphiques du mois : commandes par jour, répartition des statuts,
 * CA commandé par pack, commandes par gouvernorat. Barres `ink` (structure), `orange` réservé au
 * premier élément ; statuts en mot + icône + couleur. Chaque graphique a sa table pour lecteurs d'écran.
 */
@Component({
  selector: 'sc-dashboard-charts',
  imports: [DemoBadge, Icon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section aria-labelledby="charts-title" class="flex flex-col gap-4">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div class="flex items-center gap-3">
          <h2 id="charts-title" class="m-0 text-heading font-extrabold">Analyse du mois</h2>
          @if (demo) {
            <sc-demo-badge />
          }
        </div>
        <span class="text-sm font-semibold text-ink-muted">Cohorte des commandes créées ce mois-ci</span>
      </div>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <!-- 1. Commandes par jour -->
          <article class="bg-surface-raised rounded-lg shadow-card p-5 flex flex-col gap-4 min-w-0" aria-labelledby="chart-daily">
            <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 id="chart-daily" class="m-0 text-title font-extrabold">Commandes par jour</h3>
              @if (dailyChart(); as c) {
                <span class="text-sm font-semibold text-ink-muted"
                  >{{ c.total }} au total · pic {{ c.peak }}</span
                >
              }
            </header>
            @if (errors().daily) {
              <ng-container *ngTemplateOutlet="chartError" />
            } @else if (!daily()) {
              <div class="sc-skeleton h-56" aria-hidden="true"></div>
            } @else if (dailyChart(); as c) {
              @if (c.empty) {
                <p class="m-0 py-16 text-center text-body-sm text-ink-muted">Pas encore de commande ce mois-ci.</p>
              } @else {
                <div class="relative" (mouseleave)="hoverDay.set(null)">
                  <div class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
                    <!-- Axe Y (3 graduations) -->
                    <div class="relative h-48 text-xs leading-4 font-semibold text-ink-muted text-right tabular-nums" aria-hidden="true">
                      <!-- Largeur réservée par la plus longue graduation -->
                      <span class="invisible block">{{ c.ticks[0] }}</span>
                      @for (t of c.ticks; track t; let j = $index) {
                        <span class="absolute right-0 -translate-y-1/2" [style.top.%]="j * 50">{{ t }}</span>
                      }
                    </div>
                    <div class="relative h-48" aria-hidden="true">
                      <!-- Grille discrète -->
                      <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <span class="border-t border-dashed border-line"></span>
                        <span class="border-t border-dashed border-line"></span>
                        <span class="border-t border-line-strong"></span>
                      </div>
                      <div class="absolute inset-0 flex items-end gap-0.5">
                        @for (d of c.days; track d.date; let i = $index) {
                          <div
                            class="relative flex-1 h-full flex items-end cursor-default"
                            (mouseenter)="hoverDay.set(i)"
                          >
                            <span
                              class="block w-full rounded-t-xs transition-opacity duration-120 motion-reduce:transition-none"
                              [class]="d.isPeak ? 'bg-orange' : 'bg-ink'"
                              [class.opacity-40]="hoverDay() !== null && hoverDay() !== i"
                              [style.height.%]="d.pct"
                              [style.min-height.px]="d.orders > 0 ? 2 : 0"
                            ></span>
                          </div>
                        }
                      </div>
                      @if (hovered(); as h) {
                        <div
                          class="absolute -top-2 z-10 -translate-x-1/2 -translate-y-full px-3 py-2 rounded-sm bg-ink text-ink-inverse shadow-lift text-xs font-semibold whitespace-nowrap pointer-events-none"
                          [style.left.%]="h.x"
                        >
                          <span class="block font-extrabold">{{ h.label }}</span>
                          {{ h.orders }} · {{ h.revenue }}
                        </div>
                      }
                    </div>
                    <span></span>
                    <!-- Axe X : un repère par semaine -->
                    <div class="relative h-5 mt-1.5 text-xs font-semibold text-ink-muted" aria-hidden="true">
                      @for (t of c.xTicks; track t.day) {
                        <span class="absolute -translate-x-1/2" [style.left.%]="t.x">{{ t.day }}</span>
                      }
                    </div>
                  </div>
                </div>
                <table class="sc-sr">
                  <caption>Commandes et CA commandé par jour</caption>
                  <thead>
                    <tr><th scope="col">Jour</th><th scope="col">Commandes</th><th scope="col">CA commandé</th></tr>
                  </thead>
                  <tbody>
                    @for (d of c.days; track d.date) {
                      <tr><th scope="row">{{ d.label }}</th><td>{{ d.orders }}</td><td>{{ d.revenue }}</td></tr>
                    }
                  </tbody>
                </table>
              }
            }
          </article>

          <!-- 2. Répartition des statuts -->
          <article class="bg-surface-raised rounded-lg shadow-card p-5 flex flex-col gap-4 min-w-0" aria-labelledby="chart-status">
            <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 id="chart-status" class="m-0 text-title font-extrabold">Répartition des statuts</h3>
              @if (statusRows(); as s) {
                <span class="text-sm font-semibold text-ink-muted">{{ s.total }} commande{{ s.totalRaw > 1 ? 's' : '' }}</span>
              }
            </header>
            @if (statusRows(); as s) {
              @if (s.totalRaw === 0) {
                <p class="m-0 py-16 text-center text-body-sm text-ink-muted">Aucune commande ce mois-ci.</p>
              } @else {
                <!-- Barre empilée : vue d'ensemble -->
                <div class="flex h-3 rounded-pill overflow-hidden gap-0.5 bg-surface-sunken" aria-hidden="true">
                  @for (r of s.rows; track r.status) {
                    @if (r.count > 0) {
                      <span class="block h-full" [class]="r.dot" [style.width.%]="r.pct"></span>
                    }
                  }
                </div>
                <ul class="m-0 p-0 list-none flex flex-col gap-2.5">
                  @for (r of s.rows; track r.status) {
                    <li class="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
                      <span class="inline-flex items-center gap-1.5 font-bold min-w-0" [class]="r.ink">
                        <sc-icon [name]="r.icon" [size]="15" [strokeWidth]="2.5" />
                        <span class="truncate text-ink">{{ r.label }}</span>
                      </span>
                      <span class="h-2 rounded-pill bg-surface-sunken overflow-hidden block" aria-hidden="true">
                        <span class="block h-full rounded-pill" [class]="r.dot" [style.width.%]="r.barPct"></span>
                      </span>
                      <span class="font-extrabold tabular-nums text-right min-w-12"
                        >{{ r.countText }} <span class="text-xs font-semibold text-ink-muted">{{ r.share }}</span></span
                      >
                    </li>
                  }
                </ul>
              }
            } @else {
              <div class="sc-skeleton h-56" aria-hidden="true"></div>
            }
          </article>

          <!-- 3. CA par pack -->
          <article class="bg-surface-raised rounded-lg shadow-card p-5 flex flex-col gap-4 min-w-0" aria-labelledby="chart-packs">
            <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 id="chart-packs" class="m-0 text-title font-extrabold">CA par pack</h3>
              <span class="text-sm font-semibold text-ink-muted">Commandé, hors annulées</span>
            </header>
            @if (errors().products) {
              <ng-container *ngTemplateOutlet="chartError" />
            } @else if (!products()) {
              <div class="sc-skeleton h-44" aria-hidden="true"></div>
            } @else {
              <ng-container *ngTemplateOutlet="bars; context: { $implicit: packRows(), empty: 'Aucun pack actif.' }" />
            }
          </article>

          <!-- 4. Gouvernorats -->
          <article class="bg-surface-raised rounded-lg shadow-card p-5 flex flex-col gap-4 min-w-0" aria-labelledby="chart-gov">
            <header class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 id="chart-gov" class="m-0 text-title font-extrabold">Commandes par gouvernorat</h3>
              <span class="text-sm font-semibold text-ink-muted">Top {{ topGov }}</span>
            </header>
            @if (errors().governorates) {
              <ng-container *ngTemplateOutlet="chartError" />
            } @else if (!governorates()) {
              <div class="sc-skeleton h-44" aria-hidden="true"></div>
            } @else {
              <ng-container *ngTemplateOutlet="bars; context: { $implicit: govRows(), empty: 'Aucune commande ce mois-ci.' }" />
            }
          </article>
        </div>
    </section>

    <!-- Erreur locale : un graphique en échec n'empêche pas les autres de s'afficher -->
    <ng-template #chartError>
      <div class="flex-1 min-h-44 flex flex-col items-center justify-center gap-3 text-center rounded-md bg-surface-sunken p-5" role="status">
        <span class="inline-flex items-center gap-2 text-sm font-bold text-danger">
          <sc-icon name="alert" [size]="16" />Données indisponibles
        </span>
        <p class="m-0 text-body-sm text-ink-muted max-w-72">Ce graphique n'a pas pu être chargé. Vérifie que l'API est à jour, puis réessaie.</p>
        <button
          type="button"
          class="inline-flex items-center gap-2 h-11 px-4 rounded-sm border-0 bg-surface-raised text-ink text-sm font-bold cursor-pointer shadow-[inset_0_0_0_1px_var(--line-strong)] hover:opacity-90"
          (click)="load(false)"
        >
          <sc-icon name="refresh" [size]="16" />Réessayer
        </button>
      </div>
    </ng-template>

    <!-- Barres horizontales avec libellé et valeur directs (pas d'infobulle nécessaire) -->
    <ng-template #bars let-rows let-empty="empty">
      @if (rows.length === 0) {
        <p class="m-0 py-12 text-center text-body-sm text-ink-muted">{{ empty }}</p>
      } @else {
        <ul class="m-0 p-0 list-none flex flex-col gap-3">
          @for (r of rows; track r.key) {
            <li class="flex flex-col gap-1.5" [class.opacity-50]="r.muted">
              <div class="flex items-baseline justify-between gap-3 text-sm">
                <span class="font-bold truncate min-w-0">{{ r.label }}</span>
                <span class="font-extrabold tabular-nums whitespace-nowrap">{{ r.value }}</span>
              </div>
              <span class="h-2 rounded-pill bg-surface-sunken overflow-hidden block" aria-hidden="true">
                <span class="block h-full rounded-pill" [class]="r.top ? 'bg-orange' : r.other ? 'bg-line-strong' : 'bg-ink'" [style.width.%]="r.pct"></span>
              </span>
            </li>
          }
        </ul>
      }
    </ng-template>
  `,
})
export class DashboardCharts {
  private readonly stats = inject(StatsApi);

  readonly month = input.required<string>();
  readonly productId = input<number | null>(null);
  /** Compteurs par statut du mois (déjà chargés par le tableau de bord, mis à jour en direct). */
  readonly counts = input<OrderCounts | null>(null);
  /** Incrémenté par le parent pour un rafraîchissement silencieux (polling, changement de statut). */
  readonly refreshKey = input(0);

  protected readonly topGov = TOP_GOVERNORATES;
  /** Données seedées par le profil dev de l'API : badge « Données de démo ». */
  protected readonly demo = environment.demoDataBadge;
  protected readonly daily = signal<DayStat[] | null>(null);
  protected readonly products = signal<ProductStat[] | null>(null);
  protected readonly governorates = signal<GovernorateStat[] | null>(null);
  /** Erreur par graphique : chacun se charge (et échoue) indépendamment. */
  protected readonly errors = signal<{ daily: boolean; products: boolean; governorates: boolean }>({
    daily: false,
    products: false,
    governorates: false,
  });
  protected readonly hoverDay = signal<number | null>(null);
  private subs: Subscription[] = [];

  constructor() {
    effect(() => {
      this.month();
      this.productId();
      untracked(() => this.load(false));
    });
    let first = true;
    effect(() => {
      this.refreshKey();
      if (first) {
        first = false;
        return;
      }
      untracked(() => this.load(true));
    });
    inject(DestroyRef).onDestroy(() => this.subs.forEach((x) => x.unsubscribe()));
  }

  load(quiet: boolean): void {
    if (!quiet) {
      this.daily.set(null);
      this.products.set(null);
      this.governorates.set(null);
      this.errors.set({ daily: false, products: false, governorates: false });
    }
    this.subs.forEach((x) => x.unsubscribe());
    const month = this.month();
    const productId = this.productId();
    this.subs = [
      this.fetch('daily', this.stats.daily(month, productId), this.daily, quiet),
      // Une API antérieure à `orderedTnd` afficherait 0 TND partout : on le signale plutôt.
      this.fetch(
        'products',
        this.stats.products(month).pipe(
          map((list) => {
            if (list.some((p) => typeof p.orderedTnd !== 'number')) throw new Error('orderedTnd manquant');
            return list;
          }),
        ),
        this.products,
        quiet,
      ),
      this.fetch('governorates', this.stats.governorates(month, productId), this.governorates, quiet),
    ];
  }

  private fetch<T>(
    key: 'daily' | 'products' | 'governorates',
    source: Observable<T>,
    target: WritableSignal<T | null>,
    quiet: boolean,
  ): Subscription {
    return source.subscribe({
      next: (v) => {
        target.set(v);
        this.errors.update((e) => ({ ...e, [key]: false }));
      },
      // Rafraîchissement silencieux : on garde les dernières données affichées.
      error: () => {
        if (!quiet || target() === null) this.errors.update((e) => ({ ...e, [key]: true }));
      },
    });
  }

  protected readonly dailyChart = computed(() => {
    const days = this.daily();
    if (!days) return null;
    const peakValue = Math.max(0, ...days.map((d) => d.orders));
    const max = niceMax(peakValue);
    const peakIndex = peakValue > 0 ? days.findIndex((d) => d.orders === peakValue) : -1;
    const n = days.length;
    const total = days.reduce((s, d) => s + d.orders, 0);
    return {
      empty: total === 0,
      total: formatNumber(total),
      peak: peakIndex >= 0 ? `${formatNumber(peakValue)} le ${dayLabel(days[peakIndex].date)}` : '—',
      ticks: [formatNumber(max), formatNumber(max / 2), '0'],
      xTicks: [1, 8, 15, 22, 29].filter((d) => d <= n).map((d) => ({ day: d, x: ((d - 0.5) / n) * 100 })),
      days: days.map((d, i) => ({
        date: d.date,
        orders: d.orders,
        label: dayLabel(d.date),
        revenue: formatTnd(d.orderedTnd),
        pct: (d.orders / max) * 100,
        isPeak: i === peakIndex,
      })),
    };
  });

  protected readonly hovered = computed(() => {
    const i = this.hoverDay();
    const c = this.dailyChart();
    if (i === null || !c || !c.days[i]) return null;
    const d = c.days[i];
    // Garde l'infobulle dans le cadre aux extrémités.
    const x = Math.min(88, Math.max(12, ((i + 0.5) / c.days.length) * 100));
    return {
      x,
      label: d.label,
      orders: `${formatNumber(d.orders)} commande${d.orders > 1 ? 's' : ''}`,
      revenue: d.revenue,
    };
  });

  protected readonly statusRows = computed(() => {
    const c = this.counts();
    if (!c) return null;
    const total = STATUS_ORDER.reduce((s, k) => s + (c[k] ?? 0), 0);
    const max = Math.max(1, ...STATUS_ORDER.map((k) => c[k] ?? 0));
    return {
      total: formatNumber(total),
      totalRaw: total,
      rows: STATUS_ORDER.map((k) => {
        const status: OrderStatus = toUiStatus(k);
        const meta = STATUS_META[status];
        const count = c[k] ?? 0;
        return {
          status,
          label: meta.label,
          icon: meta.icon,
          dot: meta.dotClass,
          ink: meta.laneInk,
          count,
          countText: formatNumber(count),
          share: total ? `${Math.round((count / total) * 100)} %` : '',
          pct: total ? (count / total) * 100 : 0,
          barPct: (count / max) * 100,
        };
      }),
    };
  });

  protected readonly packRows = computed<BarRow[]>(() => {
    const list = this.products() ?? [];
    const selected = this.productId();
    const sorted = [...list].sort((a, b) => (b.orderedTnd ?? 0) - (a.orderedTnd ?? 0));
    const max = Math.max(1, ...sorted.map((p) => p.orderedTnd ?? 0));
    return sorted.map((p, i) => ({
      key: String(p.productId),
      label: p.name,
      value: formatTnd(p.orderedTnd ?? 0),
      pct: ((p.orderedTnd ?? 0) / max) * 100,
      top: i === 0 && (p.orderedTnd ?? 0) > 0,
      // Filtre pack actif : les autres packs restent visibles, en retrait.
      muted: selected != null && p.productId !== selected,
    }));
  });

  protected readonly govRows = computed<BarRow[]>(() => {
    const list = this.governorates() ?? [];
    const head = list.slice(0, TOP_GOVERNORATES);
    const rest = list.slice(TOP_GOVERNORATES).reduce((s, g) => s + g.orders, 0);
    const max = Math.max(1, ...head.map((g) => g.orders), rest);
    const rows: BarRow[] = head.map((g, i) => ({
      key: g.governorate,
      label: g.governorate,
      value: `${formatNumber(g.orders)} · ${g.sharePct} %`,
      pct: (g.orders / max) * 100,
      top: i === 0,
    }));
    if (rest > 0) {
      const total = list.reduce((s, g) => s + g.orders, 0);
      rows.push({
        key: '__autres',
        label: `Autres (${list.length - TOP_GOVERNORATES})`,
        value: `${formatNumber(rest)} · ${Math.round((rest / total) * 100)} %`,
        pct: (rest / max) * 100,
        other: true,
      });
    }
    return rows;
  });
}
