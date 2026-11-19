import {
  bucketLabel,
  bucketLongLabel,
  comparisonWindow,
  daysBetween,
  granularityFor,
  isFutureBucket,
  isIsoDate,
  nowLocalIso,
  periodLabel,
  periodOf,
  reachesToday,
  shiftPeriod,
  shortRangeLabel,
  todayInTunis,
} from './period';

describe('period', () => {
  it('builds calendar periods around an anchor', () => {
    // 16 novembre 2026 = lundi.
    expect(periodOf('day', '2026-11-16')).toEqual({
      kind: 'day',
      from: '2026-11-16',
      to: '2026-11-16',
    });
    expect(periodOf('week', '2026-11-19')).toEqual({
      kind: 'week',
      from: '2026-11-16',
      to: '2026-11-22',
    });
    expect(periodOf('week', '2026-11-22')).toEqual({
      kind: 'week',
      from: '2026-11-16',
      to: '2026-11-22',
    });
    expect(periodOf('month', '2026-02-14')).toEqual({
      kind: 'month',
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(periodOf('month', '2028-02-14').to).toBe('2028-02-29');
    expect(periodOf('year', '2026-11-16')).toEqual({
      kind: 'year',
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(periodOf('custom', '2026-11-16')).toEqual({
      kind: 'custom',
      from: '2026-10-18',
      to: '2026-11-16',
    });
  });

  it('shifts periods, keeping calendar boundaries', () => {
    expect(shiftPeriod(periodOf('day', '2026-11-01'), -1).from).toBe('2026-10-31');
    expect(shiftPeriod(periodOf('week', '2026-11-16'), 1)).toEqual({
      kind: 'week',
      from: '2026-11-23',
      to: '2026-11-29',
    });
    expect(shiftPeriod(periodOf('month', '2026-03-31'), -1)).toEqual({
      kind: 'month',
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(shiftPeriod(periodOf('month', '2026-12-05'), 1).from).toBe('2027-01-01');
    expect(shiftPeriod(periodOf('year', '2026-06-01'), -1)).toEqual({
      kind: 'year',
      from: '2025-01-01',
      to: '2025-12-31',
    });
    // Une plage libre glisse de sa propre durée (10 jours).
    expect(shiftPeriod({ kind: 'custom', from: '2026-11-01', to: '2026-11-10' }, -1)).toEqual({
      kind: 'custom',
      from: '2026-10-22',
      to: '2026-10-31',
    });
  });

  it('picks the series granularity', () => {
    expect(granularityFor(periodOf('day', '2026-11-16'))).toBe('hour');
    expect(granularityFor(periodOf('week', '2026-11-16'))).toBe('day');
    expect(granularityFor(periodOf('month', '2026-11-16'))).toBe('day');
    expect(granularityFor(periodOf('year', '2026-11-16'))).toBe('month');
    expect(granularityFor({ kind: 'custom', from: '2026-11-01', to: '2026-11-02' })).toBe('hour');
    expect(granularityFor({ kind: 'custom', from: '2026-09-01', to: '2026-11-01' })).toBe('day');
    expect(granularityFor({ kind: 'custom', from: '2026-06-01', to: '2026-11-16' })).toBe('week');
    expect(granularityFor({ kind: 'custom', from: '2025-01-01', to: '2026-11-16' })).toBe('month');
  });

  it('labels periods and buckets in French', () => {
    expect(periodLabel(periodOf('day', '2026-11-16'))).toBe('Lundi 16 novembre 2026');
    expect(periodLabel(periodOf('week', '2026-11-16'))).toBe('16 – 22 nov. 2026');
    expect(periodLabel(periodOf('week', '2026-11-30'))).toBe('30 nov. – 6 déc. 2026');
    expect(periodLabel(periodOf('week', '2026-12-30'))).toBe('28 déc. 2026 – 3 janv. 2027');
    expect(periodLabel(periodOf('month', '2026-11-16'))).toBe('Novembre 2026');
    expect(periodLabel(periodOf('year', '2026-11-16'))).toBe('2026');

    expect(bucketLabel('2026-11-03T14:00', 'hour')).toBe('14 h');
    expect(bucketLabel('2026-11-03T00:00', 'day')).toBe('3 nov.');
    expect(bucketLabel('2026-11-01T00:00', 'month')).toBe('nov. 26');
    expect(bucketLongLabel('2026-11-16T23:00', 'hour')).toBe('Lun. 16 nov. · 23 h – 0 h');
    expect(bucketLongLabel('2026-11-16T00:00', 'day')).toBe('Lundi 16 novembre 2026');
    expect(bucketLongLabel('2026-11-16T00:00', 'week')).toBe('Semaine du 16 novembre 2026');
  });

  it('validates dates and knows today in Tunis', () => {
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2028-02-29')).toBe(true);
    expect(isIsoDate('16/11/2026')).toBe(false);
    expect(daysBetween('2026-11-01', '2026-11-30')).toBe(30);
    // 23:30 UTC le 31 décembre = 00:30 le 1er janvier à Tunis.
    expect(todayInTunis(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
    expect(reachesToday(periodOf('month', '2026-11-01'), '2026-11-16')).toBe(true);
    expect(reachesToday(periodOf('month', '2026-10-01'), '2026-11-16')).toBe(false);
  });
});

describe('period — comparison window', () => {
  it('compares a running period to the same elapsed span', () => {
    expect(comparisonWindow(periodOf('month', '2026-11-16'), '2026-11-16')).toEqual({
      from: '2026-10-01',
      to: '2026-10-16',
    });
    // 31 mars → février (28 jours) : plafonné à la fin du mois précédent → période entière (null).
    expect(comparisonWindow(periodOf('month', '2026-03-31'), '2026-03-31')).toBeNull();
    expect(comparisonWindow(periodOf('week', '2026-11-18'), '2026-11-18')).toEqual({
      from: '2026-11-09',
      to: '2026-11-11',
    });
    expect(comparisonWindow(periodOf('year', '2026-11-16'), '2026-11-16')).toEqual({
      from: '2025-01-01',
      to: '2025-11-16',
    });
    // Période passée : comparaison complète par défaut.
    expect(comparisonWindow(periodOf('month', '2026-10-01'), '2026-11-16')).toBeNull();
  });

  it('labels short ranges and detects future buckets', () => {
    expect(shortRangeLabel('2026-10-01', '2026-10-16')).toBe('1–16 oct.');
    expect(shortRangeLabel('2026-09-28', '2026-10-04')).toBe('28 sept. – 4 oct.');
    expect(nowLocalIso(new Date('2026-11-16T10:05:00Z'))).toBe('2026-11-16T11:05');
    expect(isFutureBucket('2026-11-16T11:00', '2026-11-16T11:05')).toBe(false);
    expect(isFutureBucket('2026-11-16T12:00', '2026-11-16T11:05')).toBe(true);
    expect(isFutureBucket('2026-11-17T00:00', '2026-11-16T11:05')).toBe(true);
  });
});
