import { ChangeDetectionStrategy, Component, computed, model, signal } from '@angular/core';
import {
  MAX_CUSTOM_DAYS,
  PERIOD_KINDS,
  Period,
  PeriodKind,
  daysBetween,
  isIsoDate,
  periodLabel,
  periodOf,
  reachesToday,
  shiftPeriod,
  todayInTunis,
} from '../core/period';
import { Icon } from './icon';

/**
 * Sélecteur de période de l'analytique : Jour · Semaine · Mois · Année · Personnalisé, flèches précédent/suivant,
 * retour à aujourd'hui, et plage libre (Du / Au) en champs date natifs.
 */
@Component({
  selector: 'sc-period-picker',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-center gap-3' },
  template: `
    <div
      role="group"
      aria-label="Type de période"
      class="inline-flex rounded-md bg-surface-sunken p-1"
    >
      @for (k of kinds; track k.kind) {
        <button
          type="button"
          class="h-9 px-3.5 rounded-sm border-0 text-sm font-extrabold cursor-pointer transition-colors duration-120"
          [class]="
            value().kind === k.kind
              ? 'bg-surface-raised text-ink shadow-card'
              : 'bg-transparent text-ink-muted hover:text-ink'
          "
          [attr.aria-pressed]="value().kind === k.kind"
          (click)="selectKind(k.kind)"
        >
          {{ k.label }}
        </button>
      }
    </div>

    <div class="inline-flex items-center gap-1">
      <button
        type="button"
        class="grid size-11 place-items-center rounded-md border-0 bg-transparent text-ink cursor-pointer hover:bg-surface-sunken"
        aria-label="Période précédente"
        (click)="shift(-1)"
      >
        <sc-icon name="chevronLeft" [size]="18" />
      </button>
      <span
        class="min-w-44 px-1 text-center text-sm font-extrabold whitespace-nowrap"
        aria-live="polite"
      >
        <sc-icon name="calendarRange" [size]="16" class="mr-1.5 align-[-3px] text-ink-muted" />{{
          label()
        }}
      </span>
      <button
        type="button"
        class="grid size-11 place-items-center rounded-md border-0 bg-transparent text-ink cursor-pointer hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-35"
        aria-label="Période suivante"
        [disabled]="atToday()"
        (click)="shift(1)"
      >
        <sc-icon name="chevronRight" [size]="18" />
      </button>
      @if (!atToday() && value().kind !== 'custom') {
        <button
          type="button"
          class="h-9 px-3 rounded-sm border-0 bg-transparent text-sm font-bold text-ink-muted underline underline-offset-4 cursor-pointer hover:text-ink"
          (click)="goToday()"
        >
          Aujourd'hui
        </button>
      }
    </div>

    @if (value().kind === 'custom') {
      <div class="inline-flex flex-wrap items-center gap-2 text-sm font-bold">
        <label class="inline-flex items-center gap-2">
          Du
          <input
            type="date"
            class="h-11 px-3 rounded-md border-[1.5px] border-line-strong bg-surface-raised text-ink text-base"
            [value]="value().from"
            [max]="value().to"
            (change)="setCustom($any($event.target).value, value().to)"
          />
        </label>
        <label class="inline-flex items-center gap-2">
          Au
          <input
            type="date"
            class="h-11 px-3 rounded-md border-[1.5px] border-line-strong bg-surface-raised text-ink text-base"
            [value]="value().to"
            [min]="value().from"
            [max]="today()"
            (change)="setCustom(value().from, $any($event.target).value)"
          />
        </label>
        @if (error(); as e) {
          <span class="text-danger font-semibold" role="alert">{{ e }}</span>
        }
      </div>
    }
  `,
})
export class PeriodPicker {
  readonly value = model.required<Period>();

  protected readonly kinds = PERIOD_KINDS;
  protected readonly today = signal(todayInTunis());
  protected readonly error = signal<string | null>(null);

  protected readonly label = computed(() => periodLabel(this.value()));
  protected readonly atToday = computed(() => reachesToday(this.value(), this.today()));

  protected selectKind(kind: PeriodKind): void {
    const cur = this.value();
    if (kind === cur.kind) return;
    this.error.set(null);
    this.today.set(todayInTunis());
    // Plage libre : on part de la période affichée ; sinon la période qui contient aujourd'hui (ou la fin affichée).
    if (kind === 'custom') {
      this.value.set({ kind, from: cur.from, to: cur.to > this.today() ? this.today() : cur.to });
      return;
    }
    this.value.set(periodOf(kind, reachesToday(cur, this.today()) ? this.today() : cur.to));
  }

  protected shift(dir: 1 | -1): void {
    this.error.set(null);
    this.value.set(shiftPeriod(this.value(), dir));
  }

  protected goToday(): void {
    this.today.set(todayInTunis());
    this.value.set(periodOf(this.value().kind, this.today()));
  }

  protected setCustom(from: string, to: string): void {
    if (!isIsoDate(from) || !isIsoDate(to)) {
      this.error.set('Date invalide.');
      return;
    }
    if (to < from) {
      this.error.set('La date de fin doit suivre la date de début.');
      return;
    }
    if (daysBetween(from, to) > MAX_CUSTOM_DAYS) {
      this.error.set('5 ans maximum.');
      return;
    }
    this.error.set(null);
    this.value.set({ kind: 'custom', from, to });
  }
}
