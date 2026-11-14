/** Formatage FR (fr-TN) : séparateur de milliers = espace fine insécable, virgule décimale. */

/** Espace fine insécable (U+202F), séparateur de milliers. */
export const THIN_SPACE = ' ';
/** Espace insécable (U+00A0) entre le nombre et l'unité. */
export const NBSP = ' ';
/** Vrai signe moins (U+2212). */
export const MINUS = '−';

/** 12638 → « 12 638 », 12638.5 → « 12 638,5 », -40 → « −40 ». */
export function formatNumber(value: number, maxDecimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  const negative = value < 0;
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(Math.abs(value) * factor) / factor;
  const [intPart, decPart] = rounded.toFixed(maxDecimals).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THIN_SPACE);
  const decimals = decPart ? decPart.replace(/0+$/, '') : '';
  return (negative && rounded !== 0 ? MINUS : '') + grouped + (decimals ? ',' + decimals : '');
}

/** 12638 → « 12 638 TND ». */
export function formatTnd(value: number | null | undefined): string {
  if (value == null) return '—';
  return formatNumber(value) + NBSP + 'TND';
}

/** 8 → « 8 % ». */
export function formatPct(value: number | null | undefined, maxDecimals = 1): string {
  if (value == null) return '—';
  return formatNumber(value, maxDecimals) + NBSP + '%';
}

/** Variation signée : 18 → « +18 % », -2 (pts) → « −2 pts ». */
export function formatDelta(value: number, unit: '%' | 'pts'): string {
  const sign = value > 0 ? '+' : '';
  return sign + formatNumber(value, 1) + NBSP + unit;
}

/** « SC-2948 » → « 2948 » (affiché « #2948 »). */
export function refNumber(ref: string): string {
  return ref.replace(/^SC-/i, '');
}

/** Premier prénom (« Mohamed Ben Ali » → « Mohamed »). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Initiales pour l'avatar (« Admin » → « AD », « Sarra Ben Salah » → « SB »). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Ancienneté courte d'une commande, comme sur les cartes :
 * « à l'instant », « il y a 12 min », « il y a 3 h », « hier », « 2 j ».
 */
export function relativeAge(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, now - t);
  if (diff < MINUTE) return "à l'instant";
  if (diff < HOUR) return `il y a ${Math.floor(diff / MINUTE)} min`;
  if (diff < DAY) return `il y a ${Math.floor(diff / HOUR)} h`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'hier';
  return `${days} j`;
}

/** « reçue il y a 4 min », « reçue hier », « reçue il y a 2 j ». */
export function receivedAge(iso: string, now: number = Date.now()): string {
  const age = relativeAge(iso, now);
  if (!age) return '';
  if (/^\d/.test(age)) return `reçue il y a ${age}`;
  return `reçue ${age}`;
}

export const TIME_ZONE = 'Africa/Tunis';

/** Date + heure lisibles en heure de Tunis : « 14 nov. 2026 · 11:32 ». */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const date = new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
  const time = new Intl.DateTimeFormat('fr-FR', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${date} · ${time}`;
}

// ---------- Mois (YYYY-MM) ----------

const MONTHS_LONG = [
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

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function parseMonth(month: string): [number, number] | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const index = Number(m[2]) - 1;
  if (index < 0 || index > 11) return null;
  return [year, index];
}

/** Mois courant au fuseau Africa/Tunis, au format YYYY-MM. */
export function currentMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? String(now.getFullYear());
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${year}-${month}`;
}

/** « 2026-11 » → « Novembre 2026 ». */
export function monthLabel(month: string): string {
  const p = parseMonth(month);
  if (!p) return month;
  return `${capitalize(MONTHS_LONG[p[1]])} ${p[0]}`;
}

/** « 2026-11 » → « Nov. 2026 ». */
export function monthShortLabel(month: string): string {
  const p = parseMonth(month);
  if (!p) return month;
  return `${capitalize(MONTHS_SHORT[p[1]])} ${p[0]}`;
}

/** Décale un mois YYYY-MM de `delta` mois. */
export function shiftMonth(month: string, delta: number): string {
  const p = parseMonth(month);
  if (!p) return month;
  const total = p[0] * 12 + p[1] + delta;
  const year = Math.floor(total / 12);
  const index = total - year * 12;
  return `${year}-${String(index + 1).padStart(2, '0')}`;
}

/** Les `count` derniers mois, du plus récent au plus ancien. */
export function recentMonths(from: string, count = 12): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(from, -i));
}
