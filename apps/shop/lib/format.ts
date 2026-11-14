/** "12638" → "12 638" (thin non-breaking space, never wraps). */
export function formatAmount(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
}

/** 6.5 → "6,5" (French decimal comma). */
export function formatDecimal(n: number): string {
  return String(n).replace(".", ",");
}

export const TIME_ZONE = "Africa/Tunis";

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** ISO date → "Lun. 14:32" in Tunis time (Suivi.dc.html). */
export function formatStepDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: TIME_ZONE }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE }).format(d);
  return `${capitalize(day)} ${time}`;
}

function tunisDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
}

/** "2026-11-16" → "aujourd'hui" | "demain" | "lundi 16 novembre". */
export function formatEta(eta: string, now: Date = new Date()): string {
  const [y, m, day] = eta.split("-").map(Number);
  if (!y || !m || !day) return eta;
  const target = new Date(Date.UTC(y, m - 1, day, 12));
  const today = tunisDayKey(now);
  const tomorrow = tunisDayKey(new Date(now.getTime() + 24 * 3600 * 1000));
  if (eta === today) return "aujourd'hui";
  if (eta === tomorrow) return "demain";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(target);
}
