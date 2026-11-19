import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  contentChild,
  input,
  signal,
} from '@angular/core';
import { Icon, IconName } from '../icon';

/**
 * Carte de graphique : titre, sous-titre, légende (projetée via `[legend]`), bascule Graphique ⇄ Tableau.
 * Le graphique et son tableau sont fournis en `<ng-template #chart>` / `<ng-template #table>` : le tableau est
 * l'équivalent accessible de chaque graphique (toutes les valeurs, sans survol).
 */
@Component({
  selector: 'sc-chart-card',
  imports: [Icon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'flex flex-col gap-4 min-w-0 bg-surface-raised rounded-lg p-5 shadow-card ring-1 ring-line',
  },
  template: `
    <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
      <div class="flex min-w-48 flex-1 items-start gap-3">
        @if (icon(); as i) {
          <span
            class="size-9 shrink-0 rounded-sm grid place-items-center bg-surface-sunken text-ink"
          >
            <sc-icon [name]="i" [size]="18" />
          </span>
        }
        <div class="flex min-w-0 flex-col">
          <h2 class="m-0 text-title font-extrabold">{{ heading() }}</h2>
          @if (subtitle()) {
            <p class="m-0 text-sm text-ink-muted font-semibold">{{ subtitle() }}</p>
          }
        </div>
      </div>
      <ng-content select="[actions]" />
      @if (tableTpl()) {
        <button
          type="button"
          class="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm border-0 bg-transparent text-sm font-bold text-ink-muted cursor-pointer hover:bg-surface-sunken hover:text-ink"
          [attr.aria-pressed]="showTable()"
          (click)="showTable.set(!showTable())"
        >
          <sc-icon [name]="showTable() ? chartIcon() : 'table'" [size]="16" />
          {{ showTable() ? 'Graphique' : 'Tableau' }}
          <span class="sc-sr"> : {{ heading() }}</span>
        </button>
      }
    </div>
    <ng-content select="[legend]" />
    <div class="min-w-0">
      @if (showTable() && tableTpl(); as t) {
        <div class="max-h-96 overflow-auto rounded-sm ring-1 ring-line">
          <ng-container [ngTemplateOutlet]="t" />
        </div>
      } @else if (chartTpl(); as c) {
        <ng-container [ngTemplateOutlet]="c" />
      }
    </div>
    <ng-content />
  `,
})
export class ChartCard {
  readonly heading = input.required<string>();
  readonly subtitle = input<string>('');
  readonly icon = input<IconName | null>(null);
  /** Icône du bouton de retour au graphique. */
  readonly chartIcon = input<IconName>('chartColumn');

  protected readonly chartTpl = contentChild<TemplateRef<unknown>>('chart');
  protected readonly tableTpl = contentChild<TemplateRef<unknown>>('table');
  protected readonly showTable = signal(false);
}

/** Classe des tableaux de données (vue tableau des graphiques), définie dans styles.css. */
export const DATA_TABLE = 'sc-data-table';
