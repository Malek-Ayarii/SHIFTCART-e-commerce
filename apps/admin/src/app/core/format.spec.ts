import {
  currentMonth,
  formatDelta,
  formatNumber,
  formatPct,
  formatTnd,
  initials,
  monthLabel,
  monthShortLabel,
  receivedAge,
  recentMonths,
  refNumber,
  relativeAge,
  shiftMonth,
} from './format';

const THIN = ' ';
const NBSP = ' ';

describe('money formatter', () => {
  it('groups thousands with a thin no-break space and appends TND', () => {
    expect(formatTnd(12638)).toBe(`12${THIN}638${NBSP}TND`);
    expect(formatTnd(89)).toBe(`89${NBSP}TND`);
    expect(formatTnd(1234567)).toBe(`1${THIN}234${THIN}567${NBSP}TND`);
    expect(formatTnd(0)).toBe(`0${NBSP}TND`);
  });

  it('keeps useful decimals with a French comma', () => {
    expect(formatTnd(12638.5)).toBe(`12${THIN}638,5${NBSP}TND`);
    expect(formatTnd(41.25)).toBe(`41,25${NBSP}TND`);
    expect(formatTnd(40.0)).toBe(`40${NBSP}TND`);
  });

  it('uses a real minus sign and a dash for missing values', () => {
    expect(formatNumber(-1068)).toBe(`−1${THIN}068`);
    expect(formatTnd(null)).toBe('—');
  });

  it('formats percentages and deltas', () => {
    expect(formatPct(8)).toBe(`8${NBSP}%`);
    expect(formatPct(45.5)).toBe(`45,5${NBSP}%`);
    expect(formatDelta(18, '%')).toBe(`+18${NBSP}%`);
    expect(formatDelta(-2, 'pts')).toBe(`−2${NBSP}pts`);
    expect(formatDelta(0, '%')).toBe(`0${NBSP}%`);
  });
});

describe('relative age', () => {
  const now = Date.parse('2026-11-14T12:00:00Z');
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('matches the order card wording', () => {
    expect(relativeAge(ago(20_000), now)).toBe("à l'instant");
    expect(relativeAge(ago(12 * 60_000), now)).toBe('il y a 12 min');
    expect(relativeAge(ago(3 * 3_600_000), now)).toBe('il y a 3 h');
    expect(relativeAge(ago(30 * 3_600_000), now)).toBe('hier');
    expect(relativeAge(ago(2 * 86_400_000 + 1000), now)).toBe('2 j');
  });

  it('builds the detail header wording', () => {
    expect(receivedAge(ago(4 * 60_000), now)).toBe('reçue il y a 4 min');
    expect(receivedAge(ago(30 * 3_600_000), now)).toBe('reçue hier');
    expect(receivedAge(ago(3 * 86_400_000), now)).toBe('reçue il y a 3 j');
  });
});

describe('months and labels', () => {
  it('labels months in French', () => {
    expect(monthLabel('2026-11')).toBe('Novembre 2026');
    expect(monthShortLabel('2026-11')).toBe('Nov. 2026');
    expect(monthShortLabel('2026-02')).toBe('Févr. 2026');
  });

  it('shifts months across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', 2)).toBe('2027-01');
    expect(recentMonths('2026-02', 3)).toEqual(['2026-02', '2026-01', '2025-12']);
  });

  it('computes the current month in Africa/Tunis', () => {
    // 31 déc. 23:30 UTC = 1er janv. 00:30 à Tunis (UTC+1)
    expect(currentMonth(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01');
  });

  it('formats refs and initials', () => {
    expect(refNumber('SC-2948')).toBe('2948');
    expect(initials('Admin')).toBe('AD');
    expect(initials('Sarra Ben Salah')).toBe('SB');
  });
});
