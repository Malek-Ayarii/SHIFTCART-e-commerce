import { TestBed } from '@angular/core/testing';
import { KpiCard } from './kpi-card';

function render(inputs: Record<string, unknown>): HTMLElement {
  const fixture = TestBed.createComponent(KpiCard);
  for (const [k, v] of Object.entries(inputs)) fixture.componentRef.setInput(k, v);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('KpiCard', () => {
  it('renders label, value and delta with the default period', () => {
    const el = render({ label: 'Commandes', value: '142', icon: 'package', delta: '+18 %', trend: 'up' });
    expect(el.textContent).toContain('Commandes');
    expect(el.querySelector('[data-testid="kpi-value"]')?.textContent?.trim()).toBe('142');
    const delta = el.querySelector('[data-testid="kpi-delta"]');
    expect(delta?.textContent).toContain('+18 %');
    expect(delta?.textContent).toContain('vs mois dernier');
    expect(delta?.className).toContain('text-success');
  });

  it('puts the icon on orange only for the accent card', () => {
    const accent = render({ label: 'Commandes', value: '142', accent: true });
    expect(accent.querySelector('[data-testid="kpi-icon"]')?.className).toContain('bg-orange');
    const plain = render({ label: 'À confirmer', value: '22' });
    expect(plain.querySelector('[data-testid="kpi-icon"]')?.className).toContain('bg-surface-sunken');
    expect(plain.querySelector('[data-testid="kpi-delta"]')).toBeNull();
  });

  it('colors by business meaning: a falling return rate is good (green)', () => {
    const el = render({ label: 'Taux de retour', value: '8 %', delta: '−2 pts', trend: 'down', good: true });
    expect(el.querySelector('[data-testid="kpi-delta"]')?.className).toContain('text-success');
  });

  it('shows an unfavourable change in danger', () => {
    const el = render({
      label: 'Frais transporteur',
      value: '903 TND',
      delta: '129 colis × 7 TND',
      trend: 'down',
      good: false,
      period: ' ',
    });
    // Montant : chiffre en Syne, unité « TND » plus petite.
    const value = el.querySelector('[data-testid="kpi-value"]');
    expect(value?.textContent?.replace(/\s+/g, ' ').trim()).toBe('903 TND');
    expect(value?.querySelector('span')?.textContent?.trim()).toBe('TND');
    const delta = el.querySelector('[data-testid="kpi-delta"]');
    expect(delta?.className).toContain('text-danger');
    expect(delta?.textContent).not.toContain('vs mois dernier');
  });
});
