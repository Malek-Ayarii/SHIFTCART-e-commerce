/** Dates civiles de l'agenda (`AAAA-MM-JJ`), calculées en UTC pour éviter les décalages de fuseau. */

import { TIME_ZONE } from '../../core/format';

export type AgendaView = 'jour' | 'mois' | 'annee';

export const WEEKDAYS_SHORT = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];
export const MONTHS_SHORT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
export const MONTHS_LONG = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Aujourd'hui en heure de Tunis. */
export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now);
}

export function isValidIso(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function parts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function toIso(y: number, m: number, d: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export function addDays(iso: string, n: number): string {
  const { y, m, d } = parts(iso);
  return toIso(y, m, d + n);
}

/** Décale d'un nombre de mois en restant dans le mois cible (31 → 30/28). */
export function addMonths(iso: string, n: number): string {
  const { y, m, d } = parts(iso);
  const last = daysInMonth(y, m + n);
  return toIso(y, m + n, Math.min(d, last));
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** 0 = lundi … 6 = dimanche. */
export function weekdayMonFirst(iso: string): number {
  const { y, m, d } = parts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** « Mercredi 19 novembre 2026 ». */
export function longDayLabel(iso: string): string {
  const { y, m, d } = parts(iso);
  const s = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** « mer. 19 nov. » */
export function shortDayLabel(iso: string): string {
  const { y, m, d } = parts(iso);
  return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

/** Heure de Tunis d'un instant ISO : « 14:32 » et l'heure (0–23). */
export function tunisTime(iso: string): { label: string; hour: number } {
  const d = new Date(iso);
  const label = new Intl.DateTimeFormat('fr-FR', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(d);
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(d),
  );
  return { label, hour: Number.isNaN(hour) ? 0 : hour };
}

/** Grille du mois : semaines de 7 cases (null = hors du mois), lundi en premier. */
export function monthGrid(y: number, m: number): (string | null)[][] {
  const first = toIso(y, m, 1);
  const offset = weekdayMonFirst(first);
  const total = daysInMonth(y, m);
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let d = 1; d <= total; d++) cells.push(toIso(y, m, d));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Intensité 0–4 d'une case (séquentiel, une seule teinte : l'encre de la marque) →
 * fond `color-mix` à partir des tokens (suit les thèmes clair et sombre).
 */
export function heatLevel(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

const HEAT_PCT = [0, 6, 11, 17, 24];

export function heatBackground(level: number): string {
  return level === 0
    ? 'var(--surface-raised)'
    : `color-mix(in oklab, var(--ink) ${HEAT_PCT[level]}%, var(--surface-raised))`;
}
