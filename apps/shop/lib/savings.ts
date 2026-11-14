/** SavingsCalculator maths (SPEC A1 › Calcule tes économies). */
export const SAVINGS_DEFAULTS = {
  min: 4,
  max: 10,
  step: 0.5,
  defaultValue: 6,
  homeCostPerDay: 0.5,
  daysPerMonth: 30,
} as const;

/** (dépense − café maison) × jours, never negative. */
export function savingsFor(daily: number, homeCostPerDay: number = SAVINGS_DEFAULTS.homeCostPerDay, days: number = SAVINGS_DEFAULTS.daysPerMonth): number {
  return Math.max(0, (daily - homeCostPerDay) * days);
}

/** Number of days until the pack has paid for itself. */
export function paybackDays(packPrice: number, daily: number, homeCostPerDay: number = SAVINGS_DEFAULTS.homeCostPerDay): number {
  return Math.ceil(packPrice / Math.max(0.01, daily - homeCostPerDay));
}

/** Concrete equivalent of a monthly saving (reference copy). */
export function treatFor(amount: number): string {
  if (amount >= 200) return "un concert + le resto d'après";
  if (amount >= 140) return "une place de concert";
  if (amount >= 100) return "un jeu vidéo neuf";
  return "une sortie ciné entre potes";
}
