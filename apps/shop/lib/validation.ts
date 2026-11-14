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
  addressEmpty: "Ton adresse permet au livreur de te trouver.",
  addressShort: "Précise ta rue, ton quartier et ta ville.",
  /** Only reachable by bypassing the 200-character textarea. */
  addressLong: "Ton adresse est trop longue (200 caractères max).",
  productUnavailable: "Ce pack n'est plus disponible.",
} as const;

export const ADDRESS_MIN = 10;
export const ADDRESS_MAX = 200;

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

/** Exact delivery address (checkout v2): 10 to 200 characters after trim. */
export function validateAddress(input: string | null | undefined): string | null {
  const a = String(input ?? "").trim();
  if (a.length === 0) return MESSAGES.addressEmpty;
  if (a.length < ADDRESS_MIN) return MESSAGES.addressShort;
  if (a.length > ADDRESS_MAX) return MESSAGES.addressLong;
  return null;
}

/** Trims and collapses inner blank runs (keeps the courier-friendly text, drops stray spaces). */
export function normalizeAddress(input: string): string {
  return input
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " ").replace(/\s*,$/, ""))
    .filter(Boolean)
    .join(", ");
}

/** The 4 fields of the checkout, in display order (docs/SPEC-V2.md › Checkout v2). */
export type CheckoutField = "customerName" | "phone" | "governorate" | "address";
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;
export const CHECKOUT_FIELDS: readonly CheckoutField[] = ["customerName", "phone", "governorate", "address"];

export interface CheckoutValues {
  customerName: string;
  phone: string;
  governorate: string;
  address: string;
}

export function validateCheckout(values: CheckoutValues): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const name = validateName(values.customerName);
  const phone = validateTnPhone(values.phone);
  const gov = validateGovernorate(values.governorate);
  const address = validateAddress(values.address);
  if (name) errors.customerName = name;
  if (phone) errors.phone = phone;
  if (gov) errors.governorate = gov;
  if (address) errors.address = address;
  return errors;
}

/** "9 infos à corriger" banner copy (CheckoutErreurs.dc.html). */
export function errorBannerText(count: number): string {
  return `${count} info${count > 1 ? "s" : ""} à corriger avant de valider`;
}
