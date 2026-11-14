import { DEFAULT_SAVINGS } from '../../core/pack-utils';
import { mapsSearchUrl } from '../order-detail/order-detail-page';
import { InfoDraft, parsePrice, toProductInput, validateInfo } from './pack-editor-page';

const draft = (patch: Partial<InfoDraft> = {}): InfoDraft => ({
  name: 'Le Pack Barista',
  slug: 'pack-barista',
  sku: '',
  badge: 'Best-seller',
  tagline: 'Ton café de pro partout avec toi.',
  audience: '',
  description: '',
  price: '89',
  active: true,
  featured: false,
  savingsOn: false,
  savings: { ...DEFAULT_SAVINGS },
  ...patch,
});

describe('pack editor validation', () => {
  it('accepts a valid active pack', () => {
    expect(validateInfo(draft())).toEqual({});
  });

  it('refuses to activate a pack without price (API message)', () => {
    expect(validateInfo(draft({ price: '' }))['priceTnd']).toBe("Fixe un prix avant d'activer ce pack.");
    expect(validateInfo(draft({ price: '0' }))['priceTnd']).toBe("Fixe un prix avant d'activer ce pack.");
    expect(validateInfo(draft({ price: '', active: false }))).toEqual({});
  });

  it('checks name, tagline, slug and price format', () => {
    const e = validateInfo(draft({ name: 'ab', tagline: 'abc', slug: 'Pack Barista', price: '12,3456' }));
    expect(Object.keys(e).sort()).toEqual(['name', 'priceTnd', 'slug', 'tagline']);
    expect(validateInfo(draft({ price: 'abc' }))['priceTnd']).toContain('prix positif');
  });

  it('validates the savings calculator when enabled', () => {
    expect(validateInfo(draft({ savingsOn: true }))).toEqual({});
    expect(validateInfo(draft({ savingsOn: true, savings: { ...DEFAULT_SAVINGS, min: 10, max: 4 } }))['savings']).toBeTruthy();
  });

  it('parses French decimal prices', () => {
    expect(parsePrice('89,5')).toBe(89.5);
    expect(parsePrice(' 1 089 ')).toBe(1089);
    expect(parsePrice('-3')).toBeNull();
  });

  it('builds the ProductInput (optional fields omitted / nulled, SKU upper-cased)', () => {
    expect(toProductInput(draft({ sku: 'pack-x', slug: '', savingsOn: true }))).toEqual({
      name: 'Le Pack Barista',
      sku: 'PACK-X',
      badge: 'Best-seller',
      tagline: 'Ton café de pro partout avec toi.',
      audience: null,
      description: null,
      priceTnd: 89,
      active: true,
      featured: false,
      savings: DEFAULT_SAVINGS,
    });
  });
});

describe('order detail — Maps link', () => {
  it('builds a Google Maps search URL with the exact address', () => {
    expect(mapsSearchUrl('12 rue de Marseille, cité El Khadra, Tunis (près de la pharmacie)', 'Tunis')).toBe(
      'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent('12 rue de Marseille, cité El Khadra, Tunis (près de la pharmacie), Tunisie'),
    );
    expect(mapsSearchUrl('Rue Ibn Khaldoun 4', 'Sousse')).toContain(encodeURIComponent('Rue Ibn Khaldoun 4, Sousse, Tunisie'));
  });
});
