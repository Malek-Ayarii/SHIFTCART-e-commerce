import { HttpErrorResponse } from '@angular/common/http';
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_ERRORS,
  clampPct,
  defaultSku,
  formatBytes,
  monthlySavings,
  nudgeHotspot,
  pointToHotspot,
  slugify,
  validateImageFile,
  validationErrors,
} from './pack-utils';

describe('slugify', () => {
  it('lowercases, strips accents and joins words with dashes', () => {
    expect(slugify('Le Pack Barista')).toBe('le-pack-barista');
    expect(slugify('Le Pack Setup & Productivité')).toBe('le-pack-setup-productivite');
    expect(slugify('  Pack   Espace — Autonome !  ')).toBe('pack-espace-autonome');
    expect(slugify('Cœur Été 2026')).toBe('coeur-ete-2026');
  });

  it('returns an empty string when nothing is usable', () => {
    expect(slugify('')).toBe('');
    expect(slugify('&&&')).toBe('');
  });

  it('caps the slug at 80 characters without a trailing dash', () => {
    const s = slugify('a'.repeat(79) + ' b');
    expect(s.length).toBeLessThanOrEqual(80);
    expect(s.endsWith('-')).toBe(false);
  });

  it('derives a default SKU', () => {
    expect(defaultSku('pack-barista')).toBe('PACK-BARISTA');
    expect(defaultSku('le-pack-meal-prep')).toBe('PACK-MEAL-PREP');
    expect(defaultSku('')).toBe('');
  });
});

describe('validateImageFile (client-side pre-check)', () => {
  const file = (type: string, size: number, name = 'photo.png') => ({ type, size, name });

  it('accepts JPEG, PNG and WebP up to 8 MB', () => {
    expect(validateImageFile(file('image/jpeg', 1000, 'a.jpg'))).toBeNull();
    expect(validateImageFile(file('image/png', MAX_UPLOAD_BYTES))).toBeNull();
    expect(validateImageFile(file('image/webp', 5000, 'a.webp'))).toBeNull();
  });

  it('rejects other formats with the API message', () => {
    expect(validateImageFile(file('image/gif', 10, 'a.gif'))).toBe(UPLOAD_ERRORS.badType);
    expect(validateImageFile(file('application/pdf', 10, 'a.pdf'))).toBe(UPLOAD_ERRORS.badType);
    expect(UPLOAD_ERRORS.badType).toBe('Format accepté : JPEG, PNG ou WebP.');
  });

  it('rejects files over 8 MB with the API message', () => {
    expect(validateImageFile(file('image/png', MAX_UPLOAD_BYTES + 1))).toBe(UPLOAD_ERRORS.tooLarge);
    expect(UPLOAD_ERRORS.tooLarge).toBe('Photo trop lourde (8 Mo max).');
  });

  it('falls back on the extension when the browser gives no type', () => {
    expect(validateImageFile(file('', 10, 'photo.JPEG'))).toBeNull();
    expect(validateImageFile(file('', 10, 'photo.heic'))).toBe(UPLOAD_ERRORS.badType);
  });

  it('formats sizes in French units', () => {
    expect(formatBytes(8 * 1024 * 1024)).toBe('8 Mo');
    expect(formatBytes(512 * 1024)).toBe('512 Ko');
  });
});

describe('hotspot % computation', () => {
  const rect = { left: 100, top: 50, width: 400, height: 200 };

  it('maps a click inside the photo to x/y percentages', () => {
    expect(pointToHotspot(300, 150, rect)).toEqual({ x: 50, y: 50 });
    expect(pointToHotspot(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(pointToHotspot(388, 182, rect)).toEqual({ x: 72, y: 66 });
  });

  it('rounds to one decimal and clamps to 0–100', () => {
    expect(pointToHotspot(101, 51, rect)).toEqual({ x: 0.3, y: 0.5 });
    expect(pointToHotspot(50, 10, rect)).toEqual({ x: 0, y: 0 });
    expect(pointToHotspot(900, 900, rect)).toEqual({ x: 100, y: 100 });
  });

  it('centres the pin when the photo has no size', () => {
    expect(pointToHotspot(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 50, y: 50 });
  });

  it('nudges with the arrow keys (1 %, 5 % with Shift) within bounds', () => {
    const h = { x: 84, y: 66 };
    expect(nudgeHotspot(h, 'ArrowLeft')).toEqual({ x: 83, y: 66 });
    expect(nudgeHotspot(h, 'ArrowDown', true)).toEqual({ x: 84, y: 71 });
    expect(nudgeHotspot({ x: 99, y: 0 }, 'ArrowRight', true)).toEqual({ x: 100, y: 0 });
    expect(nudgeHotspot({ x: 10, y: 0.5 }, 'ArrowUp')).toEqual({ x: 10, y: 0 });
    expect(nudgeHotspot(h, 'Enter')).toBeNull();
    expect(clampPct(-3)).toBe(0);
  });
});

describe('validationErrors', () => {
  it('extracts 422 field errors only', () => {
    const e422 = new HttpErrorResponse({ status: 422, error: { errors: { slug: 'Ce lien est déjà utilisé par un autre pack.' } } });
    expect(validationErrors(e422)).toEqual({ slug: 'Ce lien est déjà utilisé par un autre pack.' });
    expect(validationErrors(new HttpErrorResponse({ status: 409, error: { error: 'X', message: 'y' } }))).toBeNull();
    expect(validationErrors(new Error('x'))).toBeNull();
  });
});

describe('monthlySavings', () => {
  it('computes the default monthly saving', () => {
    expect(
      monthlySavings({ title: '', question: '', min: 4, max: 10, step: 0.5, defaultValue: 6, homeCostPerDay: 0.5, daysPerMonth: 30 }),
    ).toBe(165);
  });
});
