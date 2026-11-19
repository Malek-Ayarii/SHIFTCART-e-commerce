import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Valeur affichée (« 12 », « 1 068 TND »). */
  display: string;
  /** Complément discret à droite (« 34 % », « 75 % de l'étape préc. »). */
  note?: string;
}

/**
 * Barres classées horizontales (« meter list ») : nom, barre fine d'une seule teinte, chiffre — toutes les valeurs
 * sont écrites, donc pas d'infobulle nécessaire. Bout de donnée arrondi, base carrée, piste un cran sous la surface.
 */
@Component({
  selector: 'sc-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (rows().length) {
      <ul class="m-0 flex list-none flex-col gap-3 p-0" [attr.aria-label]="label()">
        @for (r of view(); track r.key) {
          <li class="flex flex-col gap-1.5">
            <div class="flex items-baseline gap-3 text-sm">
              <span class="min-w-0 flex-1 truncate font-semibold text-ink" [title]="r.label">{{
                r.label
              }}</span>
              <span class="font-extrabold text-ink tabular-nums">{{ r.display }}</span>
              @if (r.note) {
                <span class="w-14 text-right text-xs font-bold text-ink-muted tabular-nums">{{
                  r.note
                }}</span>
              }
            </div>
            <div class="h-2 overflow-hidden rounded-r-[4px] bg-surface-sunken" aria-hidden="true">
              <div
                class="h-full rounded-r-[4px] transition-[width] duration-500"
                [style.width.%]="r.pct"
                style="background: var(--chart-accent)"
              ></div>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="m-0 py-6 text-center text-sm text-ink-muted">{{ empty() }}</p>
    }
  `,
})
export class BarList {
  readonly rows = input.required<BarRow[]>();
  readonly label = input('');
  /** Référence de 100 % (défaut : la plus grande valeur). */
  readonly max = input<number | null>(null);
  readonly empty = input('Aucune commande sur la période.');

  protected readonly view = computed(() => {
    const rows = this.rows();
    const max = this.max() ?? Math.max(0, ...rows.map((r) => r.value));
    return rows.map((r) => ({
      ...r,
      pct: max > 0 ? Math.max(r.value > 0 ? 1.5 : 0, (r.value / max) * 100) : 0,
    }));
  });
}
