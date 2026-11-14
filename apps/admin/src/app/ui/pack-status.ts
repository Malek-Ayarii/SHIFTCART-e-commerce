import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from './icon';

/** Statut d'un pack : « Actif » / « Brouillon » — mot + icône + couleur. */
@Component({
  selector: 'sc-pack-status',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: `<sc-icon [name]="active() ? 'circleCheck' : 'circleDashed'" [size]="12" [strokeWidth]="2.5" />{{
      active() ? 'Actif' : 'Brouillon'
    }}`,
})
export class PackStatus {
  readonly active = input.required<boolean>();
  protected readonly classes = computed(
    () =>
      'inline-flex items-center gap-1 h-6 px-2 rounded-sm text-xs font-extrabold tracking-[0.04em] uppercase whitespace-nowrap ' +
      (this.active() ? 'bg-success-soft text-success' : 'bg-surface-sunken text-ink-muted shadow-[inset_0_0_0_1px_var(--line)]'),
  );
}
