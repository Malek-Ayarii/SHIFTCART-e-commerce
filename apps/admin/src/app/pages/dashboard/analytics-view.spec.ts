import { AnalyticsStats, AnalyticsSummary } from '../../core/models';
import {
  breakdown,
  deltaPct,
  formatHours,
  funnelStages,
  kpiComparisonLabel,
  kpiViews,
  sourceLabel,
  trendPoints,
} from './analytics-view';

const summary = (over: Partial<AnalyticsSummary> = {}): AnalyticsSummary => ({
  orders: 10,
  revenueTnd: 890,
  collectedTnd: 534,
  avgOrderTnd: 89,
  delivered: 6,
  inProgress: 2,
  returned: 2,
  cancelled: 0,
  confirmationRatePct: 80,
  deliveryRatePct: 75,
  returnRatePct: 25,
  avgConfirmHours: 2.5,
  avgDeliveryDays: 3,
  ...over,
});

const stats = (over: Partial<AnalyticsStats> = {}): AnalyticsStats => ({
  from: '2026-11-01',
  to: '2026-11-30',
  granularity: 'day',
  previousFrom: '2026-10-01',
  previousTo: '2026-10-31',
  compareFrom: '2026-10-01',
  compareTo: '2026-10-31',
  summary: summary(),
  previous: summary({ orders: 8, revenueTnd: 712, confirmationRatePct: 75, returnRatePct: 30 }),
  series: [
    {
      start: '2026-11-01T00:00',
      orders: 4,
      revenueTnd: 356,
      collectedTnd: 178,
      delivered: 2,
      inProgress: 1,
      returned: 1,
      cancelled: 0,
    },
    {
      start: '2026-11-02T00:00',
      orders: 6,
      revenueTnd: 534,
      collectedTnd: 356,
      delivered: 4,
      inProgress: 1,
      returned: 1,
      cancelled: 0,
    },
  ],
  previousSeries: [{ start: '2026-10-01T00:00', orders: 3, revenueTnd: 267, collectedTnd: 89 }],
  funnel: { received: 10, confirmed: 8, shipped: 8, delivered: 6 },
  products: [],
  governorates: Array.from({ length: 10 }, (_, i) => ({
    governorate: `G${i}`,
    orders: 10 - i,
    revenueTnd: 0,
  })),
  sources: [
    { source: 'tiktok', orders: 7, revenueTnd: 623 },
    { source: null, orders: 3, revenueTnd: 267 },
  ],
  heatmap: [],
  ...over,
});

describe('analytics-view', () => {
  it('computes deltas against the previous period', () => {
    expect(deltaPct(10, 8)).toBe(25);
    expect(deltaPct(5, 0)).toBeNull();
    const k = kpiViews(stats(), '2026-12-01T00:00');
    expect(k.map((x) => x.label)).toEqual([
      'Commandes',
      "Chiffre d'affaires",
      'Encaissé',
      'Panier moyen',
      'Taux de confirmation',
      'Taux de retour',
    ]);
    expect(k[0].delta).toBe('+25\u00a0%');
    expect(k[0].good).toBe(true);
    expect(k[0].spark).toEqual([4, 6]);
    // Taux de retour en baisse de 5 points : favorable.
    expect(k[5].delta).toBe('−5\u00a0pts');
    expect(k[5].good).toBe(true);
    expect(k[5].trend).toBe('down');
  });

  it('has no delta without a comparison base', () => {
    const k = kpiViews(
      stats({
        previous: summary({
          orders: 0,
          revenueTnd: 0,
          collectedTnd: 0,
          avgOrderTnd: 0,
          delivered: 0,
          returned: 0,
        }),
      }),
    );
    expect(k[0].delta).toBeUndefined();
    expect(k[0].good).toBeUndefined();
    expect(k[5].delta).toBeUndefined();
  });

  it('names the real comparison window when it is truncated', () => {
    expect(kpiComparisonLabel(stats(), 'month')).toBe('vs mois préc.');
    expect(kpiComparisonLabel(stats({ compareTo: '2026-10-16' }), 'month')).toBe('vs 1–16 oct.');
  });

  it('stops the current series at now, keeps the comparison', () => {
    const t = trendPoints(stats(), 'orders', 'Octobre 2026', '2026-11-01T18:30');
    expect(t[0].value).toBe(4);
    expect(t[1].value).toBeNull();
    // Mini-courbes : une seule tranche écoulée → pas de courbe.
    expect(kpiViews(stats(), '2026-11-01T18:30')[0].spark).toBeNull();
  });

  it('aligns the previous series by index', () => {
    const t = trendPoints(stats(), 'revenue', 'Octobre 2026', '2026-12-01T00:00');
    expect(t).toHaveLength(2);
    expect(t[0]).toMatchObject({
      label: '1 nov.',
      value: 356,
      previous: 267,
      previousLong: 'Jeudi 1 octobre 2026',
    });
    expect(t[1].previous).toBeNull();
    expect(t[1].previousLong).toBe('Octobre 2026');
  });

  it('builds the funnel and folds long breakdowns into « Autres »', () => {
    const f = funnelStages(stats().funnel);
    expect(f.map((s) => [s.label, s.ofReceived, s.ofPrevious])).toEqual([
      ['Reçues', 100, null],
      ['Confirmées', 80, 80],
      ['Expédiées', 80, 100],
      ['Livrées', 60, 75],
    ]);
    const g = breakdown(stats(), 'governorates');
    expect(g).toHaveLength(8);
    expect(g[7].name).toBe('Autres (3)');
    expect(g[7].orders).toBe(3 + 2 + 1);
    const s = breakdown(stats(), 'sources');
    expect(s.map((r) => [r.name, r.sharePct])).toEqual([
      ['TikTok', 70],
      ['Direct', 30],
    ]);
  });

  it('formats labels and durations', () => {
    expect(sourceLabel(null)).toBe('Direct');
    expect(sourceLabel('newsletter')).toBe('Newsletter');
    expect(formatHours(0.5)).toBe('30 min');
    expect(formatHours(2.25)).toBe('2,3 h');
    expect(formatHours(null)).toBe('—');
  });
});
