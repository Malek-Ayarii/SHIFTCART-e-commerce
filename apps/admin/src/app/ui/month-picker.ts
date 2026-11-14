import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { currentMonth, monthLabel, monthShortLabel, recentMonths } from '../core/format';
import { Icon } from './icon';

/** Sélecteur de mois (YYYY-MM) : pastille « Nov. 2026 » avec un vrai <select> natif. */
@Component({
  selector: 'sc-month-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <label
      class="relative inline-flex items-center gap-2 h-11 px-3.5 rounded-md bg-surface-raised shadow-[inset_0_0_0_1.5px_var(--line-strong)] text-sm font-bold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus-ring"
    >
      <sc-icon name="calendar" [size]="16" />
      <span aria-hidden="true">{{ short() }}</span>
      <sc-icon name="chevronDown" [size]="16" />
      <span class="sc-sr">Mois affiché</span>
      <select
        class="absolute inset-0 opacity-0 cursor-pointer text-base"
        [value]="value()"
        (change)="value.set($any($event.target).value)"
      >
        @for (m of months(); track m) {
          <option [value]="m" [selected]="m === value()">{{ label(m) }}</option>
        }
      </select>
    </label>
  `,
})
export class MonthPicker {
  readonly value = model.required<string>();
  /** Nombre de mois proposés (jusqu'au mois courant). */
  readonly count = input(12);

  protected readonly short = computed(() => monthShortLabel(this.value()));
  protected readonly months = computed(() => {
    const list = recentMonths(currentMonth(), this.count());
    return list.includes(this.value()) ? list : [this.value(), ...list];
  });
  protected label(m: string): string {
    return monthLabel(m);
  }
}
