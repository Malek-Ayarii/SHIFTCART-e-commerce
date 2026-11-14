import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Badge « Données de démo » (maquettes Finances / Stock), affiché quand l'API sert les données seedées. */
@Component({
  selector: 'sc-demo-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'inline-flex items-center h-7 px-2.5 rounded-sm bg-warning-soft text-warning text-xs font-extrabold tracking-[0.04em] uppercase',
  },
  template: `Données de démo`,
})
export class DemoBadge {}
