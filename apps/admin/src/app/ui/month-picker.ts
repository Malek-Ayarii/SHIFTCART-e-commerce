import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { currentMonth, monthLabel, monthShortLabel, recentMonths } from '../core/format';
import { Icon } from './icon';

const MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Sélecteur de mois (YYYY-MM) : pastille « Nov. 2026 » qui ouvre une grille de 12 mois aux couleurs
 * du thème (clair / sombre), navigation par année. Mois futurs et trop anciens désactivés.
 * Clavier : flèches dans la grille, Entrée pour choisir, Échap pour fermer.
 */
@Component({
  selector: 'sc-month-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative inline-flex',
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'close(true)',
  },
  template: `
    <button
      type="button"
      class="inline-flex items-center gap-2 h-11 px-3.5 rounded-md bg-surface-raised text-ink border-0 cursor-pointer shadow-[inset_0_0_0_1.5px_var(--line-strong)] text-sm font-bold hover:bg-surface-sunken"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      [attr.aria-label]="'Mois affiché : ' + long() + '. Changer de mois'"
      (click)="toggle()"
    >
      <sc-icon name="calendar" [size]="16" />
      <span>{{ short() }}</span>
      <sc-icon name="chevronDown" [size]="16" class="transition-transform duration-120" [class.rotate-180]="open()" />
    </button>

    @if (open()) {
      <div
        role="dialog"
        aria-label="Choisir un mois"
        class="absolute right-0 top-[calc(100%+var(--spacing)*2)] z-40 w-72 p-3 rounded-lg bg-surface-raised text-ink shadow-lift border border-line sc-enter [--d:0ms]"
      >
        <div class="flex items-center gap-2 mb-3">
          <button
            type="button"
            class="size-11 grid place-items-center rounded-sm border-0 bg-transparent text-ink cursor-pointer hover:bg-surface-sunken disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Année précédente"
            [disabled]="year() <= minYear()"
            (click)="year.set(year() - 1)"
          >
            <sc-icon name="chevronRight" [size]="18" class="rotate-180" />
          </button>
          <span class="flex-1 text-center text-heading font-extrabold tabular-nums" aria-live="polite">{{ year() }}</span>
          <button
            type="button"
            class="size-11 grid place-items-center rounded-sm border-0 bg-transparent text-ink cursor-pointer hover:bg-surface-sunken disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Année suivante"
            [disabled]="year() >= maxYear()"
            (click)="year.set(year() + 1)"
          >
            <sc-icon name="chevronRight" [size]="18" />
          </button>
        </div>

        <div class="grid grid-cols-3 gap-1.5" role="group" aria-label="Mois" data-grid>
          @for (c of cells(); track c.value; let i = $index) {
            <button
              type="button"
              class="relative h-11 rounded-sm border-0 text-sm font-bold cursor-pointer transition-colors duration-120 disabled:cursor-not-allowed disabled:opacity-35"
              [class]="
                c.selected
                  ? 'bg-ink text-ink-inverse'
                  : c.current
                    ? 'bg-orange-soft text-orange-ink hover:bg-surface-sunken'
                    : 'bg-transparent text-ink hover:bg-surface-sunken'
              "
              [attr.data-index]="i"
              [attr.aria-pressed]="c.selected"
              [attr.aria-label]="c.label + (c.current ? ', mois en cours' : '')"
              [attr.tabindex]="c.focusable ? 0 : -1"
              [disabled]="c.disabled"
              (click)="pick(c.value)"
              (keydown)="onGridKey($event)"
            >
              {{ c.short }}
            </button>
          }
        </div>

        <button
          type="button"
          class="mt-3 w-full h-11 rounded-sm border-0 bg-surface-sunken text-ink text-sm font-bold cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="value() === today"
          (click)="pick(today)"
        >
          Revenir au mois en cours
        </button>
      </div>
    }
  `,
})
export class MonthPicker {
  readonly value = model.required<string>();
  /** Nombre de mois proposés (jusqu'au mois courant). */
  readonly count = input(24);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly today = currentMonth();
  protected readonly open = signal(false);
  protected readonly year = signal(Number(this.today.slice(0, 4)));

  protected readonly short = computed(() => monthShortLabel(this.value()));
  protected readonly long = computed(() => monthLabel(this.value()));

  /** Plus ancien mois proposé (ou la valeur actuelle si elle est plus ancienne). */
  private readonly oldest = computed(() => {
    const list = recentMonths(this.today, this.count());
    const min = list.reduce((a, b) => (a < b ? a : b), this.today);
    return this.value() < min ? this.value() : min;
  });
  protected readonly minYear = computed(() => Number(this.oldest().slice(0, 4)));
  protected readonly maxYear = computed(() => Number(this.today.slice(0, 4)));

  protected readonly cells = computed(() => {
    const y = this.year();
    const selected = this.value();
    const list = MONTHS.map((short, i) => {
      const value = `${y}-${pad(i + 1)}`;
      return {
        value,
        short,
        label: monthLabel(value),
        selected: value === selected,
        current: value === this.today,
        disabled: value > this.today || value < this.oldest(),
        focusable: false,
      };
    });
    // Un seul arrêt de tabulation dans la grille : le mois choisi, sinon le mois en cours, sinon le premier actif.
    const target =
      list.find((c) => c.selected && !c.disabled) ??
      list.find((c) => c.current) ??
      list.find((c) => !c.disabled);
    if (target) target.focusable = true;
    return list;
  });

  protected toggle(): void {
    if (this.open()) {
      this.close(false);
      return;
    }
    this.year.set(Number(this.value().slice(0, 4)));
    this.open.set(true);
    this.focusGrid();
  }

  close(restoreFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.host.nativeElement.querySelector<HTMLElement>('button')?.focus();
  }

  protected pick(value: string): void {
    this.value.set(value);
    this.close(true);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close(false);
  }

  /** ← → ↑ ↓ dans la grille 3 × 4, en sautant les mois désactivés. */
  protected onGridKey(event: KeyboardEvent): void {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[event.key];
    if (!step) return;
    const from = Number((event.target as HTMLElement).getAttribute('data-index'));
    if (Number.isNaN(from)) return;
    event.preventDefault();
    const cells = this.cells();
    for (let i = from + step; i >= 0 && i < cells.length; i += step) {
      if (!cells[i].disabled) {
        this.host.nativeElement.querySelector<HTMLElement>(`[data-index="${i}"]`)?.focus();
        return;
      }
    }
  }

  private focusGrid(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[data-grid] [tabindex="0"]')?.focus(),
      { injector: this.injector },
    );
  }
}
