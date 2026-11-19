import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Sparkline } from './charts/sparkline';
import { Icon, IconName } from './icon';

/**
 * KpiCard — libellé en capitales, grande valeur (Inter), variation colorée.
 * La couleur suit le sens métier (`good`), pas la flèche (`trend`).
 */
@Component({
  selector: 'sc-kpi-card',
  imports: [Icon, Sparkline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: '@container grid gap-2 min-w-0 bg-surface-raised rounded-lg p-5 shadow-card ring-1 ring-line',
  },
  template: `
    <div class="flex items-center justify-between gap-2 text-label uppercase text-ink-muted">
      <span class="min-w-0">{{ label() }}</span>
      <span
        data-testid="kpi-icon"
        class="size-9 shrink-0 rounded-sm grid place-items-center"
        [class]="accent() ? 'bg-orange text-on-orange' : 'bg-surface-sunken text-ink'"
      >
        <sc-icon [name]="icon() ?? 'trendUp'" [size]="18" />
      </span>
    </div>
    <div class="text-kpi @max-[15rem]:text-display-lg whitespace-nowrap" data-testid="kpi-value">
      {{ parts().main }}@if (parts().unit; as u) {<span class="text-heading">{{ u }}</span>}
    </div>
    @if (delta()) {
      <div
        data-testid="kpi-delta"
        class="inline-flex items-center gap-1 text-label tracking-normal normal-case"
        [class]="good() === false ? 'text-danger' : 'text-success'"
      >
        <sc-icon [name]="trend() === 'up' ? 'trendUp' : 'trendDown'" [size]="14" />
        {{ delta() }}<span class="text-ink-muted font-semibold">{{ period() }}</span>
      </div>
    } @else if (spark()) {
      <div class="text-label tracking-normal normal-case text-ink-muted font-semibold">
        Pas de comparaison
      </div>
    }
    @if (spark(); as s) {
      <sc-sparkline class="mt-1" [values]="s" />
    }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly icon = input<IconName | undefined>(undefined);
  readonly delta = input<string | undefined>(undefined);
  readonly trend = input<'up' | 'down'>('up');
  readonly good = input<boolean | undefined>(undefined);
  readonly period = input(' vs mois dernier');
  readonly accent = input(false);
  /** Mini-courbe optionnelle (valeurs par tranche de la période). */
  readonly spark = input<number[] | null>(null);

  /** « 12 638 TND » : l'unité en plus petit pour que le montant tienne dans la carte. */
  protected readonly parts = computed<{ main: string; unit: string | null }>(() => {
    const v = this.value();
    if (v.length > 3 && v.endsWith('TND')) {
      const main = v.slice(0, -3).trimEnd();
      // Espace insécable gardée dans le texte (lecteurs d'écran, copier-coller).
      if (main !== v.slice(0, -3)) return { main, unit: ' TND' };
    }
    return { main: v, unit: null };
  });
}
