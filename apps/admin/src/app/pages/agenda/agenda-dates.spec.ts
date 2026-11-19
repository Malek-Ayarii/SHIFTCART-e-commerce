import {
  addDays,
  addMonths,
  heatLevel,
  isValidIso,
  longDayLabel,
  monthGrid,
  todayIso,
  tunisTime,
  weekdayMonFirst,
} from './agenda-dates';

describe('agenda dates', () => {
  it('builds a Monday-first month grid', () => {
    // 1er novembre 2026 = dimanche → 6 cases vides avant.
    const weeks = monthGrid(2026, 11);
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0][6]).toBe('2026-11-01');
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weekdayMonFirst('2026-11-16')).toBe(0);
  });

  it('moves across days, months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-11-19', -12)).toBe('2025-11-19');
    expect(isValidIso('2026-02-30')).toBe(false);
    expect(isValidIso('2026-02-28')).toBe(true);
  });

  it('labels days and times in Tunis time', () => {
    expect(longDayLabel('2026-11-19')).toBe('Jeudi 19 novembre 2026');
    // 23:30 UTC = 00:30 le lendemain à Tunis (UTC+1).
    expect(tunisTime('2026-11-18T23:30:00Z')).toEqual({ label: '00:30', hour: 0 });
    expect(todayIso(new Date('2026-11-18T23:30:00Z'))).toBe('2026-11-19');
  });

  it('maps volumes to 5 heat levels', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(1, 10)).toBe(1);
    expect(heatLevel(10, 10)).toBe(4);
  });
});
