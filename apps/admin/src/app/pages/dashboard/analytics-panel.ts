import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { formatNumber, formatPct, formatTnd } from '../../core/format';
import { AnalyticsStats } from '../../core/models';
import { ISO_WEEKDAYS, Period, bucketLongLabel, periodLabel } from '../../core/period';
import { BarList } from '../../ui/charts/bar-list';
import { ChartCard, DATA_TABLE } from '../../ui/charts/chart-card';
import { Heatmap } from '../../ui/charts/heatmap';
import { StackedColumns } from '../../ui/charts/stacked-columns';
import { TrendChart } from '../../ui/charts/trend-chart';
import { KpiCard } from '../../ui/kpi-card';
import {
  BREAKDOWNS,
  BreakdownKind,
  OUTCOME_SERIES,
  TREND_METRICS,
  TrendMetric,
  breakdown,
  formatDays,
  formatHours,
  funnelRows,
  funnelStages,
  kpiComparisonLabel,
  kpiViews,
  metricFormat,
  outcomeColumns,
  previousPeriodLabel,
  shareBars,
  trendPoints,
} from './analytics-view';

/**
 * Analytique du tableau de bord (desktop) : KPI de la période vs la précédente, tendance, entonnoir de
 * confirmation, issues des commandes, répartition (packs / gouvernorats / sources) et heures de commande.
 * Pendant un rechargement, le rendu précédent reste affiché en opacité réduite (pas de squelette).
 */
@Component({
  selector: 'sc-analytics-panel',
  imports: [KpiCard, ChartCard, TrendChart, StackedColumns, BarList, Heatmap],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-4 transition-opacity duration-200',
    '[class.opacity-55]': 'refreshing()',
    '[attr.aria-busy]': 'refreshing()',
  },
  templateUrl: './analytics-panel.html',
})
export class AnalyticsPanel {
  readonly data = input.required<AnalyticsStats>();
  readonly period = input.required<Period>();
  readonly refreshing = input(false);

  protected readonly tableClass = DATA_TABLE;
  protected readonly metrics = TREND_METRICS;
  protected readonly breakdowns = BREAKDOWNS;
  protected readonly outcomeSeries = OUTCOME_SERIES;
  protected readonly weekdays = ISO_WEEKDAYS;
  protected readonly fmtNumber = formatNumber;
  protected readonly fmtTnd = formatTnd;
  protected readonly fmtPct = formatPct;

  protected readonly metric = signal<TrendMetric>('revenue');
  protected readonly breakdownKind = signal<BreakdownKind>('products');

  protected readonly comparison = computed(() =>
    kpiComparisonLabel(this.data(), this.period().kind),
  );
  protected readonly currentLabel = computed(() => periodLabel(this.period()));
  protected readonly previousLabel = computed(() =>
    previousPeriodLabel(this.data(), this.period().kind),
  );

  protected readonly kpis = computed(() => kpiViews(this.data()));

  protected readonly metricLabel = computed(
    () => TREND_METRICS.find((m) => m.key === this.metric())!.label,
  );
  protected readonly metricFormat = computed(() => metricFormat(this.metric()));
  protected readonly trend = computed(() =>
    trendPoints(this.data(), this.metric(), this.previousLabel()),
  );
  /** Totaux de la légende : période courante, et période précédente ENTIÈRE (celle de la courbe grise). */
  protected readonly trendTotal = computed(() => {
    const m = this.metric();
    const pick = (x: { orders: number; revenueTnd: number; collectedTnd: number }) =>
      m === 'orders' ? x.orders : m === 'revenue' ? x.revenueTnd : x.collectedTnd;
    const prev = this.data().previousSeries.reduce((sum, b) => sum + pick(b), 0);
    return {
      cur: this.metricFormat()(pick(this.data().summary)),
      prev: this.metricFormat()(Math.round(prev * 1000) / 1000),
    };
  });
  protected readonly trendSummary = computed(
    () =>
      `${this.metricLabel()} : ${this.trendTotal().cur} sur ${this.currentLabel()}, contre ${this.trendTotal().prev} sur ${this.previousLabel()}.`,
  );

  protected readonly outcomes = computed(() => outcomeColumns(this.data()));
  protected readonly outcomeTotals = computed(() => {
    const s = this.data().summary;
    const v: Record<string, number> = {
      delivered: s.delivered,
      inProgress: s.inProgress,
      returned: s.returned,
      cancelled: s.cancelled,
    };
    return OUTCOME_SERIES.map((x) => ({ ...x, total: v[x.key] }));
  });
  protected readonly outcomeSummary = computed(
    () =>
      `Issues des ${this.data().summary.orders} commandes : ` +
      this.outcomeTotals()
        .map((o) => `${o.label.toLowerCase()} ${o.total}`)
        .join(', ') +
      '.',
  );

  protected readonly funnel = computed(() => funnelStages(this.data().funnel));
  protected readonly funnelBars = computed(() => funnelRows(this.data().funnel));

  protected readonly shares = computed(() => breakdown(this.data(), this.breakdownKind()));
  protected readonly shareBars = computed(() => shareBars(this.shares()));
  protected readonly breakdownLabel = computed(
    () => BREAKDOWNS.find((b) => b.key === this.breakdownKind())!.label,
  );

  protected readonly heatRows = computed(() =>
    [...this.data().heatmap].sort(
      (a, b) => b.orders - a.orders || a.weekday - b.weekday || a.hour - b.hour,
    ),
  );

  protected readonly avgConfirm = computed(() => formatHours(this.data().summary.avgConfirmHours));
  protected readonly avgDelivery = computed(() => formatDays(this.data().summary.avgDeliveryDays));

  protected bucketLong(start: string): string {
    return bucketLongLabel(start, this.data().granularity);
  }

  protected cell(v: number | null): string {
    return v === null ? '—' : this.metricFormat()(v);
  }

  protected variation(cur: number | null, prev: number | null): string {
    if (cur === null || prev === null || prev === 0) return '—';
    const d = Math.round(((cur - prev) / prev) * 1000) / 10;
    return (d > 0 ? '+' : '') + formatPct(d);
  }
}
