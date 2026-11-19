/** Mise en forme de GET /stats/analytics pour les cartes et graphiques du tableau de bord (fonctions pures). */
import { formatDelta, formatNumber, formatPct, formatTnd } from '../../core/format';
import { AnalyticsFunnel, AnalyticsStats } from '../../core/models';
import {
  Period,
  bucketLabel,
  bucketLongLabel,
  comparisonLabel,
  isFutureBucket,
  nowLocalIso,
  periodLabel,
  shortRangeLabel,
} from '../../core/period';
import { BarRow } from '../../ui/charts/bar-list';
import { StackColumn, StackSeries } from '../../ui/charts/stacked-columns';
import { TrendPoint } from '../../ui/charts/trend-chart';
import { IconName } from '../../ui/icon';

export type TrendMetric = 'revenue' | 'orders' | 'collected';

export const TREND_METRICS: { key: TrendMetric; label: string }[] = [
  { key: 'revenue', label: "Chiffre d'affaires" },
  { key: 'orders', label: 'Commandes' },
  { key: 'collected', label: 'Encaissé' },
];

/** Issues des commandes : couleurs de statut (sens réservé), toujours avec légende + libellés + tableau. */
export const OUTCOME_SERIES: StackSeries[] = [
  { key: 'delivered', label: 'Livrées', color: 'var(--success)' },
  { key: 'inProgress', label: 'En cours', color: 'var(--info)' },
  { key: 'returned', label: 'Retournées', color: 'var(--danger)' },
  { key: 'cancelled', label: 'Annulées', color: 'var(--chart-neutral)' },
];

export interface KpiView {
  label: string;
  value: string;
  icon: IconName;
  delta?: string;
  trend: 'up' | 'down';
  good?: boolean;
  accent?: boolean;
  spark: number[] | null;
}

/** Variation relative en % (une décimale) ; null sans base de comparaison. */
export function deltaPct(cur: number, prev: number): number | null {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function ratioKpi(
  label: string,
  icon: IconName,
  cur: number,
  prev: number,
  hasBase: boolean,
  higherIsBetter: boolean,
): KpiView {
  const d = hasBase ? Math.round((cur - prev) * 10) / 10 : null;
  return {
    label,
    icon,
    value: formatPct(cur),
    delta: d === null ? undefined : formatDelta(d, 'pts'),
    trend: (d ?? 0) < 0 ? 'down' : 'up',
    good: d === null ? undefined : higherIsBetter ? d >= 0 : d <= 0,
    spark: null,
  };
}

function amountKpi(
  label: string,
  icon: IconName,
  value: string,
  cur: number,
  prev: number,
  spark: number[] | null,
  accent = false,
): KpiView {
  const d = deltaPct(cur, prev);
  return {
    label,
    icon,
    value,
    accent,
    delta: d === null ? undefined : formatDelta(d, '%'),
    trend: (d ?? 0) < 0 ? 'down' : 'up',
    good: d === null ? undefined : d >= 0,
    spark,
  };
}

export function kpiViews(a: AnalyticsStats, now: string = nowLocalIso()): KpiView[] {
  const s = a.summary;
  const p = a.previous;
  // Mini-courbes : jusqu'à maintenant seulement (pas de faux zéros pour les jours à venir).
  const elapsed = a.series.filter((b) => !isFutureBucket(b.start, now));
  const series = elapsed.length > 1 ? elapsed : null;
  return [
    amountKpi(
      'Commandes',
      'package',
      formatNumber(s.orders),
      s.orders,
      p.orders,
      series?.map((b) => b.orders) ?? null,
      true,
    ),
    amountKpi(
      "Chiffre d'affaires",
      'banknote',
      formatTnd(s.revenueTnd),
      s.revenueTnd,
      p.revenueTnd,
      series?.map((b) => b.revenueTnd) ?? null,
    ),
    amountKpi(
      'Encaissé',
      'wallet',
      formatTnd(s.collectedTnd),
      s.collectedTnd,
      p.collectedTnd,
      series?.map((b) => b.collectedTnd) ?? null,
    ),
    amountKpi(
      'Panier moyen',
      'receipt',
      formatTnd(s.avgOrderTnd),
      s.avgOrderTnd,
      p.avgOrderTnd,
      null,
    ),
    ratioKpi(
      'Taux de confirmation',
      'circleCheck',
      s.confirmationRatePct,
      p.confirmationRatePct,
      p.orders > 0 && s.orders > 0,
      true,
    ),
    ratioKpi(
      'Taux de retour',
      'undo',
      s.returnRatePct,
      p.returnRatePct,
      p.delivered + p.returned > 0 && s.delivered + s.returned > 0,
      false,
    ),
  ];
}

export function previousPeriodLabel(a: AnalyticsStats, kind: Period['kind']): string {
  return periodLabel({ kind, from: a.previousFrom, to: a.previousTo });
}

/** Libellé des variations des KPI : « vs mois préc. », ou la fenêtre réelle si elle est tronquée (« vs 1–16 oct. »). */
export function kpiComparisonLabel(a: AnalyticsStats, kind: Period['kind']): string {
  if (a.compareFrom === a.previousFrom && a.compareTo === a.previousTo)
    return comparisonLabel(kind);
  return `vs ${shortRangeLabel(a.compareFrom, a.compareTo)}`;
}

export function metricFormat(metric: TrendMetric): (v: number) => string {
  return metric === 'orders' ? (v) => formatNumber(v) : (v) => formatTnd(v);
}

export function trendPoints(
  a: AnalyticsStats,
  metric: TrendMetric,
  previousName: string,
  now: string = nowLocalIso(),
): TrendPoint[] {
  const pick = (b: { orders: number; revenueTnd: number; collectedTnd: number }) =>
    metric === 'orders' ? b.orders : metric === 'revenue' ? b.revenueTnd : b.collectedTnd;
  return a.series.map((b, i) => {
    const prev = a.previousSeries[i];
    return {
      label: bucketLabel(b.start, a.granularity),
      long: bucketLongLabel(b.start, a.granularity),
      // Tranches à venir : pas de valeur (la courbe s'arrête à maintenant, la comparaison continue).
      value: isFutureBucket(b.start, now) ? null : pick(b),
      previous: prev ? pick(prev) : null,
      previousLong: prev ? bucketLongLabel(prev.start, a.granularity) : previousName,
    };
  });
}

export function outcomeColumns(a: AnalyticsStats): StackColumn[] {
  return a.series.map((b) => ({
    label: bucketLabel(b.start, a.granularity),
    long: bucketLongLabel(b.start, a.granularity),
    values: {
      delivered: b.delivered,
      inProgress: b.inProgress,
      returned: b.returned,
      cancelled: b.cancelled,
    },
  }));
}

export interface FunnelStage {
  key: keyof AnalyticsFunnel;
  label: string;
  value: number;
  /** % des commandes reçues. */
  ofReceived: number;
  /** % de l'étape précédente (null pour la première). */
  ofPrevious: number | null;
}

export function funnelStages(f: AnalyticsFunnel): FunnelStage[] {
  const stages: { key: keyof AnalyticsFunnel; label: string }[] = [
    { key: 'received', label: 'Reçues' },
    { key: 'confirmed', label: 'Confirmées' },
    { key: 'shipped', label: 'Expédiées' },
    { key: 'delivered', label: 'Livrées' },
  ];
  const pct = (part: number, total: number) => (total ? Math.round((part / total) * 1000) / 10 : 0);
  return stages.map((s, i) => ({
    ...s,
    value: f[s.key],
    ofReceived: pct(f[s.key], f.received),
    ofPrevious: i === 0 ? null : pct(f[s.key], f[stages[i - 1].key]),
  }));
}

export function funnelRows(f: AnalyticsFunnel): BarRow[] {
  return funnelStages(f).map((s) => ({
    key: s.key,
    label: s.label,
    value: s.value,
    display: formatNumber(s.value),
    note: formatPct(s.ofReceived, 0),
  }));
}

export type BreakdownKind = 'products' | 'governorates' | 'sources';

export const BREAKDOWNS: { key: BreakdownKind; label: string }[] = [
  { key: 'products', label: 'Packs' },
  { key: 'governorates', label: 'Gouvernorats' },
  { key: 'sources', label: 'Sources' },
];

export interface ShareRow {
  key: string;
  name: string;
  orders: number;
  revenueTnd: number;
  sharePct: number;
}

/** Au-delà de `limit` lignes, la queue est regroupée en « Autres ». */
export function breakdown(a: AnalyticsStats, kind: BreakdownKind, limit = 8): ShareRow[] {
  const raw =
    kind === 'products'
      ? a.products.map((p) => ({
          key: `p${p.productId}`,
          name: p.name,
          orders: p.orders,
          revenueTnd: p.revenueTnd,
        }))
      : kind === 'governorates'
        ? a.governorates.map((g) => ({
            key: g.governorate,
            name: g.governorate,
            orders: g.orders,
            revenueTnd: g.revenueTnd,
          }))
        : a.sources.map((s) => ({
            key: s.source ?? '∅',
            name: sourceLabel(s.source),
            orders: s.orders,
            revenueTnd: s.revenueTnd,
          }));
  const total = raw.reduce((sum, r) => sum + r.orders, 0);
  const rows = raw.length > limit ? raw.slice(0, limit - 1) : raw;
  if (raw.length > limit) {
    const rest = raw.slice(limit - 1);
    rows.push({
      key: 'autres',
      name: `Autres (${rest.length})`,
      orders: rest.reduce((s, r) => s + r.orders, 0),
      revenueTnd: rest.reduce((s, r) => s + r.revenueTnd, 0),
    });
  }
  return rows.map((r) => ({
    ...r,
    sharePct: total ? Math.round((r.orders / total) * 1000) / 10 : 0,
  }));
}

export function shareBars(rows: ShareRow[]): BarRow[] {
  return rows.map((r) => ({
    key: r.key,
    label: r.name,
    value: r.orders,
    display: formatNumber(r.orders),
    note: formatPct(r.sharePct, 0),
  }));
}

/** utm_source → libellé : null = « Direct », noms de réseaux connus, sinon première lettre en capitale. */
export function sourceLabel(source: string | null): string {
  if (!source) return 'Direct';
  const known: Record<string, string> = {
    tiktok: 'TikTok',
    instagram: 'Instagram',
    facebook: 'Facebook',
    fb: 'Facebook',
    ig: 'Instagram',
    google: 'Google',
    whatsapp: 'WhatsApp',
    demo: 'Démo',
  };
  return known[source.toLowerCase()] ?? source.charAt(0).toUpperCase() + source.slice(1);
}

/** « 2,3 h », « 45 min », « 3,1 j » ; « — » sans donnée. */
export function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${formatNumber(h, 1)} h`;
}

export function formatDays(d: number | null): string {
  if (d === null) return '—';
  return `${formatNumber(d, 1)} j`;
}
