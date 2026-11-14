import { HttpErrorResponse } from '@angular/common/http';
import { Hotspot, Savings, ValidationErrorBody } from './models';

// ---------- Slug ----------

/**
 * Slug d'URL depuis un nom (même règle que l'API) : minuscules, sans accents, tirets.
 * « Le Pack Setup & Productivité » → « le-pack-setup-productivite ».
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** SKU par défaut : `PACK-<SLUG>` (sans le préfixe « pack- » redondant). */
export function defaultSku(slug: string): string {
  const core = slug.replace(/^(le-)?pack-/, '');
  return core ? `PACK-${core.toUpperCase()}` : '';
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------- Envoi de photos ----------

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

/** Messages identiques à ceux de l'API (CONTRACT v2 › médias). */
export const UPLOAD_ERRORS = {
  tooLarge: 'Photo trop lourde (8 Mo max).',
  badType: 'Format accepté : JPEG, PNG ou WebP.',
} as const;

/** Vérification côté navigateur avant l'envoi (l'API revérifie par les octets magiques). */
export function validateImageFile(file: Pick<File, 'size' | 'type' | 'name'>): string | null {
  const type = (file.type || guessType(file.name)).toLowerCase();
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type)) return UPLOAD_ERRORS.badType;
  if (file.size > MAX_UPLOAD_BYTES) return UPLOAD_ERRORS.tooLarge;
  return null;
}

function guessType(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return '';
}

/** 8 388 608 → « 8 Mo », 512 000 → « 500 Ko ». */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.0', '').replace('.', ',')} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

// ---------- Points d'intérêt ----------

const round1 = (v: number) => Math.round(v * 10) / 10;
export const clampPct = (v: number) => round1(Math.min(100, Math.max(0, v)));

/** Position d'un clic dans la photo → hotspot en % (0–100, 1 décimale). */
export function pointToHotspot(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): Hotspot {
  if (rect.width <= 0 || rect.height <= 0) return { x: 50, y: 50 };
  return {
    x: clampPct(((clientX - rect.left) / rect.width) * 100),
    y: clampPct(((clientY - rect.top) / rect.height) * 100),
  };
}

/** Déplacement au clavier : flèches = 1 %, Maj + flèches = 5 %. */
export function nudgeHotspot(h: Hotspot, key: string, big = false): Hotspot | null {
  const step = big ? 5 : 1;
  switch (key) {
    case 'ArrowLeft':
      return { x: clampPct(h.x - step), y: h.y };
    case 'ArrowRight':
      return { x: clampPct(h.x + step), y: h.y };
    case 'ArrowUp':
      return { x: h.x, y: clampPct(h.y - step) };
    case 'ArrowDown':
      return { x: h.x, y: clampPct(h.y + step) };
    default:
      return null;
  }
}

// ---------- Validation (422) ----------

/** `{ errors: { champ: message } }` d'une réponse 422, sinon null. */
export function validationErrors(err: unknown): Record<string, string> | null {
  if (err instanceof HttpErrorResponse && err.status === 422) {
    const body = err.error as Partial<ValidationErrorBody> | null;
    if (body && typeof body === 'object' && body.errors && typeof body.errors === 'object') {
      return body.errors;
    }
  }
  return null;
}

// ---------- Calculateur ----------

export const DEFAULT_SAVINGS: Savings = {
  title: 'Calcule tes économies',
  question: 'Combien tu dépenses par jour ?',
  min: 4,
  max: 10,
  step: 0.5,
  defaultValue: 6,
  homeCostPerDay: 0.5,
  daysPerMonth: 30,
};

/** Économie mensuelle affichée par le calculateur (valeur initiale). */
export function monthlySavings(s: Savings, perDay = s.defaultValue): number {
  return Math.max(0, (perDay - s.homeCostPerDay) * s.daysPerMonth);
}
