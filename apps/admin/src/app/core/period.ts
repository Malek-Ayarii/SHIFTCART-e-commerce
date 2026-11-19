/**
 * Périodes d'analyse du tableau de bord : jour, semaine (lundi → dimanche), mois, année ou plage libre.
 * Les dates sont des jours civils « AAAA-MM-JJ » à Tunis ; les calculs se font en UTC pur pour ne jamais
 * dépendre du fuseau du navigateur.
 */
import { Granularity } from './models';
import { TIME_ZONE } from './format';

export type PeriodKind = 'day' | 'week' | 'month' | 'year' | 'custom';

export interface Period {
  kind: PeriodKind;
  /** Premier jour inclus (AAAA-MM-JJ). */
  from: string;
  /** Dernier jour inclus (AAAA-MM-JJ). */
  to: string;
}

export const PERIOD_KINDS: { kind: PeriodKind; label: string }[] = [
  { kind: 'day', label: 'Jour' },
  { kind: 'week', label: 'Semaine' },
  { kind: 'month', label: 'Mois' },
  { kind: 'year', label: 'Année' },
  { kind: 'custom', label: 'Personnalisé' },
];

/** Plage libre max (miroir de l'API : 5 ans). */
export const MAX_CUSTOM_DAYS = 1830;

const DAY_MS = 86_400_000;

const MONTHS = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
const MONTHS_SHORT = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
/** Index = getUTCDay() (0 = dimanche). */
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const WEEKDAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
/** Index = jour ISO − 1 (0 = lundi), pour la carte de chaleur. */
export const ISO_WEEKDAYS_SHORT = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
export const ISO_WEEKDAYS = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Dates AAAA-MM-JJ ----------

export function isIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toIso(parse(s)) === s;
}

function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, days: number): string {
  return toIso(new Date(parse(s).getTime() + days * DAY_MS));
}

function addMonths(s: string, months: number): string {
  const d = parse(s);
  return toIso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)));
}

/** Nombre de jours inclus entre deux dates (« 2026-11-01 » → « 2026-11-30 » = 30). */
export function daysBetween(from: string, to: string): number {
  return Math.round((parse(to).getTime() - parse(from).getTime()) / DAY_MS) + 1;
}

function lastDayOfMonth(s: string): string {
  return addDays(addMonths(s, 1), -1);
}

/** Aujourd'hui à Tunis (AAAA-MM-JJ). */
export function todayInTunis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// ---------- Périodes ----------

/** La période de type `kind` qui contient `anchor`. Pour `custom` : les 30 jours finissant à `anchor`. */
export function periodOf(kind: PeriodKind, anchor: string): Period {
  const d = parse(anchor);
  switch (kind) {
    case 'day':
      return { kind, from: anchor, to: anchor };
    case 'week': {
      const monday = addDays(anchor, -((d.getUTCDay() + 6) % 7));
      return { kind, from: monday, to: addDays(monday, 6) };
    }
    case 'month': {
      const first = anchor.slice(0, 8) + '01';
      return { kind, from: first, to: lastDayOfMonth(first) };
    }
    case 'year': {
      const y = anchor.slice(0, 4);
      return { kind, from: `${y}-01-01`, to: `${y}-12-31` };
    }
    case 'custom':
      return { kind, from: addDays(anchor, -29), to: anchor };
  }
}

/** Période précédente (−1) ou suivante (+1) du même type ; une plage libre glisse de sa propre durée. */
export function shiftPeriod(p: Period, dir: 1 | -1): Period {
  switch (p.kind) {
    case 'day':
      return periodOf('day', addDays(p.from, dir));
    case 'week':
      return periodOf('week', addDays(p.from, 7 * dir));
    case 'month':
      return periodOf('month', addMonths(p.from, dir));
    case 'year':
      return periodOf('year', addMonths(p.from, 12 * dir));
    case 'custom': {
      const span = daysBetween(p.from, p.to);
      return { kind: 'custom', from: addDays(p.from, span * dir), to: addDays(p.to, span * dir) };
    }
  }
}

/** La période contient-elle aujourd'hui (ou est-elle dans le futur) ? Alors « suivante » n'a pas de sens. */
export function reachesToday(p: Period, today: string = todayInTunis()): boolean {
  return p.to >= today;
}

/** Découpage : heure pour un jour, jour pour une semaine ou un mois, mois pour une année ; auto en libre. */
export function granularityFor(p: Period): Granularity {
  switch (p.kind) {
    case 'day':
      return 'hour';
    case 'week':
    case 'month':
      return 'day';
    case 'year':
      return 'month';
    case 'custom': {
      const days = daysBetween(p.from, p.to);
      if (days <= 2) return 'hour';
      if (days <= 62) return 'day';
      if (days <= 183) return 'week';
      return 'month';
    }
  }
}

function dayMonth(s: string, short = true): string {
  const d = parse(s);
  return `${d.getUTCDate()} ${(short ? MONTHS_SHORT : MONTHS)[d.getUTCMonth()]}`;
}

/** Titre de la période : « Lundi 16 novembre 2026 », « 16 – 22 nov. 2026 », « Novembre 2026 », « 2026 ». */
export function periodLabel(p: Period): string {
  const f = parse(p.from);
  const t = parse(p.to);
  switch (p.kind) {
    case 'day':
      return `${cap(WEEKDAYS[f.getUTCDay()])} ${f.getUTCDate()} ${MONTHS[f.getUTCMonth()]} ${f.getUTCFullYear()}`;
    case 'month':
      return `${cap(MONTHS[f.getUTCMonth()])} ${f.getUTCFullYear()}`;
    case 'year':
      return String(f.getUTCFullYear());
    case 'week':
    case 'custom': {
      if (p.from === p.to) return `${dayMonth(p.from)} ${f.getUTCFullYear()}`;
      const sameYear = f.getUTCFullYear() === t.getUTCFullYear();
      const sameMonth = sameYear && f.getUTCMonth() === t.getUTCMonth();
      const start = sameMonth
        ? String(f.getUTCDate())
        : sameYear
          ? dayMonth(p.from)
          : `${dayMonth(p.from)} ${f.getUTCFullYear()}`;
      return `${start} – ${dayMonth(p.to)} ${t.getUTCFullYear()}`;
    }
  }
}

/** Libellé de la comparaison des KPI : « vs veille », « vs mois précédent »… */
export function comparisonLabel(kind: PeriodKind): string {
  switch (kind) {
    case 'day':
      return 'vs veille';
    case 'week':
      return 'vs semaine préc.';
    case 'month':
      return 'vs mois préc.';
    case 'year':
      return 'vs année préc.';
    case 'custom':
      return 'vs période préc.';
  }
}

// ---------- Tranches de série (« 2026-11-03T14:00 ») ----------

function bucketParts(start: string): { date: string; hour: number } {
  return { date: start.slice(0, 10), hour: Number(start.slice(11, 13)) || 0 };
}

/** Étiquette courte d'axe : « 14 h », « 3 nov. », « 3 nov. » (semaine), « nov. 26 ». */
export function bucketLabel(start: string, g: Granularity): string {
  const { date, hour } = bucketParts(start);
  const d = parse(date);
  switch (g) {
    case 'hour':
      return `${hour} h`;
    case 'day':
    case 'week':
      return dayMonth(date);
    case 'month':
      return `${MONTHS_SHORT[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
  }
}

/** Libellé complet pour les infobulles et tableaux. */
export function bucketLongLabel(start: string, g: Granularity): string {
  const { date, hour } = bucketParts(start);
  const d = parse(date);
  switch (g) {
    case 'hour':
      return `${cap(WEEKDAYS_SHORT[d.getUTCDay()])} ${dayMonth(date)} · ${hour} h – ${(hour + 1) % 24} h`;
    case 'day':
      return `${cap(WEEKDAYS[d.getUTCDay()])} ${dayMonth(date, false)} ${d.getUTCFullYear()}`;
    case 'week':
      return `Semaine du ${dayMonth(date, false)} ${d.getUTCFullYear()}`;
    case 'month':
      return `${cap(MONTHS[d.getUTCMonth()])} ${d.getUTCFullYear()}`;
  }
}

/**
 * Fenêtre de comparaison des KPI. Pour une période en cours (qui contient aujourd'hui), on compare à la même durée
 * écoulée de la période précédente (1er–16 oct. pour novembre au 16), sinon le mois entier fausserait la variation.
 * `null` = la période précédente entière (comportement par défaut de l'API).
 */
export function comparisonWindow(
  p: Period,
  today: string = todayInTunis(),
): { from: string; to: string } | null {
  if (!reachesToday(p, today) || today < p.from) return null;
  const prev = shiftPeriod(p, -1);
  const elapsedTo = addDays(prev.from, daysBetween(p.from, today) - 1);
  const to = elapsedTo < prev.to ? elapsedTo : prev.to;
  return to === prev.to ? null : { from: prev.from, to };
}

/** « 1–16 oct. », « 28 sept. – 4 oct. », « 3 nov. » (sans l'année, pour les libellés courts). */
export function shortRangeLabel(from: string, to: string): string {
  if (from === to) return dayMonth(from);
  const f = parse(from);
  const t = parse(to);
  if (f.getUTCFullYear() === t.getUTCFullYear() && f.getUTCMonth() === t.getUTCMonth()) {
    return `${f.getUTCDate()}–${dayMonth(to)}`;
  }
  return `${dayMonth(from)} – ${dayMonth(to)}`;
}

/** Maintenant à Tunis, au format des tranches de série (« 2026-11-16T11:05 »). */
export function nowLocalIso(now: Date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((x) => [x.type, x.value]),
  );
  return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}`;
}

/** Tranche entièrement dans le futur (début après maintenant) : rien à tracer pour la période courante. */
export function isFutureBucket(start: string, now: string = nowLocalIso()): boolean {
  return start.slice(0, 16) > now;
}
