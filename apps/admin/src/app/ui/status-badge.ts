import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { OrderStatus, STATUS_META } from '../core/status';
import { Icon } from './icon';

/** StatusBadge — statut du pipeline COD : toujours mot + icône + couleur. */
@Component({
  selector: 'sc-status-badge',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
  },
  template: `<sc-icon [name]="meta().icon" [size]="12" [strokeWidth]="2.5" />{{ meta().label }}`,
})
export class StatusBadge {
  readonly status = input.required<OrderStatus>();
  protected readonly meta = computed(() => STATUS_META[this.status()] ?? STATUS_META.new);
  protected readonly classes = computed(
    () =>
      'inline-flex items-center gap-1 h-6 px-2 rounded-sm text-xs font-extrabold tracking-[0.04em] uppercase whitespace-nowrap ' +
      this.meta().badgeClass,
  );
}
