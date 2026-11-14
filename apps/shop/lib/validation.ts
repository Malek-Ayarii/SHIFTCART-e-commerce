/**
 * Checkout validation shared by the client form and the Server Action.
 * Rules and messages: docs/API.md › Règles de validation (identical in apps/api).
 */

export const GOVERNORATES = [
  "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
  "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", "Médenine", "Monastir", "Nabeul",
  "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan",
] as const;
export type Governorate = (typeof GOVERNORATES)[number];

/** « Les plus demandés », shown first in the GovernorateSelect. */
export const POPULAR: readonly Governorate[] = ["Tunis", "Sousse", "Sfax", "Ariana", "Ben Arous"];

export const MESSAGES = {
  nameEmpty: "Ton nom aide le livreur à te trouver.",
  nameInvalid: "Écris ton nom et ton prénom.",
  phoneEmpty: "Ton numéro nous sert à confirmer la commande sur WhatsApp.",
  phonePrefix: "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.",
  /** Only reachable by bypassing the 8-digit input (the field never accepts more). */
  phoneTooLong: "Ton numéro doit avoir 8 chiffres (sans le +216).",
  governorate: "Choisis où te livrer.",
} as const;

export function phoneMissingMessage(missing: number): string {
  return `Il manque ${missing} chiffre${missing > 1 ? "s" : ""} (8 au total).`;
}

/**
 * Keeps digits only. Strips a pasted country code (+216 / 00216) only when exactly 8 digits
 * follow it: a local number that itself starts with 216 (e.g. 21 6xx xxx) must never be
 * truncated when one extra digit is typed.
 */
export function phoneDigits(input: string | null | undefined): string {
  let d = String(input ?? "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("00216")) d = d.slice(5);
  else if (d.length === 11 && d.startsWith("216")) d = d.slice(3);
  return d;
}

/** "98765432" → "98 765 432" (at most 8 digits). */
export function formatTnPhone(digits: string | null | undefined): string {
  const d = phoneDigits(digits).slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8)].filter(Boolean).join(" ");
}

/** 8 digits, first one in 2 3 4 5 7 9. Returns the French error message or null. */
export function validateTnPhone(input: string | null | undefined): string | null {
  const d = phoneDigits(input);
  if (d.length === 0) return MESSAGES.phoneEmpty;
  if (d.length < 8) return phoneMissingMessage(8 - d.length);
  if (d.length > 8) return MESSAGES.phoneTooLong;
  if (!"234579".includes(d[0])) return MESSAGES.phonePrefix;
  return null;
}

/** 3 to 80 characters after trim. */
export function validateName(input: string | null | undefined): string | null {
  const n = String(input ?? "").trim();
  if (n.length === 0) return MESSAGES.nameEmpty;
  if (n.length < 3 || n.length > 80) return MESSAGES.nameInvalid;
  return null;
}

export function isGovernorate(value: unknown): value is Governorate {
  return typeof value === "string" && (GOVERNORATES as readonly string[]).includes(value);
}

export function validateGovernorate(input: string | null | undefined): string | null {
  return isGovernorate(input) ? null : MESSAGES.governorate;
}

export type CheckoutField = "customerName" | "phone" | "governorate";
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;
export const CHECKOUT_FIELDS: readonly CheckoutField[] = ["customerName", "phone", "governorate"];

export interface CheckoutValues {
  customerName: string;
  phone: string;
  governorate: string;
}

export function validateCheckout(values: CheckoutValues): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const name = validateName(values.customerName);
  const phone = validateTnPhone(values.phone);
  const gov = validateGovernorate(values.governorate);
  if (name) errors.customerName = name;
  if (phone) errors.phone = phone;
  if (gov) errors.governorate = gov;
  return errors;
}

/** "9 infos à corriger" banner copy (CheckoutErreurs.dc.html). */
export function errorBannerText(count: number): string {
  return `${count} info${count > 1 ? "s" : ""} à corriger avant de valider`;
}
