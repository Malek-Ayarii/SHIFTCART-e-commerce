import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Subscription, catchError, forkJoin, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { OrdersApi } from '../../core/api/orders.api';
import { StatsApi } from '../../core/api/stats.api';
import { AppState } from '../../core/app-state';
import { apiErrorMessage } from '../../core/errors';
import {
  formatDelta,
  formatNumber,
  formatPct,
  formatTnd,
  monthLabel,
  monthShortLabel,
  shiftMonth,
} from '../../core/format';
import { FinanceStats, GovernorateStat, KpiStats, OrderCounts, ProductStat } from '../../core/models';
import { DemoBadge } from '../../ui/demo-badge';
import { ErrorState } from '../../ui/error-state';
import { IconName } from '../../ui/icon';
import { KpiCard } from '../../ui/kpi-card';
import { MonthPicker } from '../../ui/month-picker';

/** Gouvernorats mis en avant dans le rapport (maquette AdminFinances). */
const HIGHLIGHTED = new Set(['Tunis', 'Sousse']);

interface FinanceData {
  finance: FinanceStats;
  previous: FinanceStats | null;
  governorates: GovernorateStat[];
  counts: OrderCounts | null;
  kpis: KpiStats | null;
  /** v2 : par pack (null si l'endpoint ne répond pas). */
  products: ProductStat[] | null;
}

interface KpiView {
  label: string;
  value: string;
  icon: IconName;
  delta?: string;
  trend: 'up' | 'down';
  good?: boolean;
  period?: string;
  accent?: boolean;
}

/** /finances — C3 CA commandé face au CA réellement encaissé. */
@Component({
  selector: 'app-finances-page',
  imports: [KpiCard, MonthPicker, ErrorState, DemoBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  templateUrl: './finances-page.html',
})
export class FinancesPage {
  private readonly stats = inject(StatsApi);
  private readonly ordersApi = inject(OrdersApi);
  protected readonly state = inject(AppState);
  protected readonly demo = environment.demoDataBadge;

  protected readonly data = signal<FinanceData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private sub?: Subscription;

  protected readonly subtitle = computed(
    () => `${monthLabel(this.state.month())} · CA commandé face au CA réellement encaissé`,
  );

  protected readonly kpis = computed<KpiView[]>(() => {
    const d = this.data();
    if (!d) return [];
    const f = d.finance;
    const delivered = d.counts?.DELIVERED ?? d.governorates.reduce((n, g) => n + g.delivered, 0);
    const rateDiff = d.previous ? f.collectionRatePct - d.previous.collectionRatePct : null;
    return [
      {
        label: 'CA commandé',
        value: formatTnd(f.orderedTnd),
        icon: 'package',
        delta: d.kpis ? `${formatNumber(d.kpis.orders)} commandes` : undefined,
        trend: 'up',
        period: ' ',
      },
      {
        label: 'CA encaissé',
        value: formatTnd(f.collectedTnd),
        icon: 'banknote',
        delta: `${formatNumber(delivered)} livrées`,
        trend: 'up',
        period: ' ',
        accent: true,
      },
      {
        label: "Taux d'encaissement",
        value: formatPct(f.collectionRatePct, 0),
        icon: 'trendUp',
        delta: rateDiff == null ? undefined : formatDelta(Math.round(rateDiff * 10) / 10, 'pts'),
        trend: (rateDiff ?? 0) < 0 ? 'down' : 'up',
        good: (rateDiff ?? 0) >= 0,
      },
      {
        label: 'Frais transporteur',
        value: formatTnd(f.carrierFeesTnd),
        icon: 'truck',
        delta:
          f.carrierFeeTnd > 0
            ? `${formatNumber(f.shippedParcels)} colis × ${formatTnd(f.carrierFeeTnd)}`
            : `${formatNumber(f.shippedParcels)} colis · tarif [À DÉFINIR]`,
        trend: 'down',
        good: false,
        period: ' ',
      },
    ];
  });

  protected readonly chart = computed(() => {
    const d = this.data();
    if (!d) return null;
    const weeks = d.finance.weekly;
    const max = Math.max(1, ...weeks.flatMap((w) => [w.orderedTnd, w.collectedTnd]));
    const bars = weeks.map((w) => ({
      label: w.label,
      ordered: w.orderedTnd,
      collected: w.collectedTnd,
      orderedPct: (w.orderedTnd / max) * 100,
      collectedPct: (w.collectedTnd / max) * 100,
      orderedText: formatTnd(w.orderedTnd),
      collectedText: formatTnd(w.collectedTnd),
    }));
    return { bars };
  });

  protected readonly funnel = computed(() => {
    const d = this.data();
    if (!d) return null;
    const f = d.finance;
    return {
      ordered: formatTnd(f.orderedTnd),
      returns: formatTnd(f.returnsTnd),
      returnsCount: d.counts ? d.counts.RETURNED : null,
      inProgress: formatTnd(f.inProgressTnd),
      inProgressCount: d.counts ? d.counts.SHIPPED : null,
      fees: formatTnd(f.carrierFeesTnd),
      net: formatTnd(f.netTnd),
    };
  });

  protected readonly govRows = computed(() => {
    const d = this.data();
    if (!d) return [];
    const max = Math.max(1, ...d.governorates.map((g) => g.orders));
    return d.governorates.map((g) => ({
      name: g.governorate,
      highlight: HIGHLIGHTED.has(g.governorate),
      barPct: (g.orders / max) * 100,
      share: formatPct(g.sharePct, 0),
      orders: formatNumber(g.orders),
      delivered: formatNumber(g.delivered),
      returned: formatNumber(g.returned),
      collected: formatTnd(g.collectedTnd),
    }));
  });

  protected readonly productRows = computed(() => {
    const list = this.data()?.products;
    if (!list) return null;
    const max = Math.max(1, ...list.map((p) => p.orders));
    const totals = list.reduce(
      (t, p) => ({ orders: t.orders + p.orders, delivered: t.delivered + p.delivered, returned: t.returned + p.returned, collected: t.collected + p.collectedTnd }),
      { orders: 0, delivered: 0, returned: 0, collected: 0 },
    );
    return {
      rows: list.map((p, i) => ({
        id: p.productId,
        name: p.name,
        top: i === 0 && p.orders > 0,
        barPct: (p.orders / max) * 100,
        share: formatPct(p.sharePct, 0),
        orders: formatNumber(p.orders),
        plural: { orders: p.orders > 1, delivered: p.delivered > 1, returned: p.returned > 1 },
        delivered: formatNumber(p.delivered),
        returned: formatNumber(p.returned),
        deliveryRate: p.orders > 0 ? formatPct((p.delivered / p.orders) * 100, 0) : '—',
        collected: formatTnd(p.collectedTnd),
      })),
      total: {
        orders: formatNumber(totals.orders),
        delivered: formatNumber(totals.delivered),
        returned: formatNumber(totals.returned),
        collected: formatTnd(totals.collected),
      },
    };
  });

  constructor() {
    effect(() => {
      const month = this.state.month();
      untracked(() => {
        this.state.mobileSubtitle.set(monthShortLabel(month));
        this.load(month);
      });
    });
    inject(DestroyRef).onDestroy(() => this.sub?.unsubscribe());
  }

  protected reload(): void {
    this.load(this.state.month());
  }

  private load(month: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.sub?.unsubscribe();
    this.sub = forkJoin({
      finance: this.stats.finance(month),
      previous: this.stats.finance(shiftMonth(month, -1)).pipe(catchError(() => of(null))),
      governorates: this.stats.governorates(month),
      counts: this.ordersApi.counts(month).pipe(catchError(() => of(null))),
      kpis: this.stats.kpis(month).pipe(catchError(() => of(null))),
      products: this.stats.products(month).pipe(catchError(() => of(null))),
    }).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, "Les finances n'ont pas pu être chargées."));
      },
    });
  }
}
