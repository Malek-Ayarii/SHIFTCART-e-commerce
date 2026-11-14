import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Button } from './button';
import { Icon } from './icon';

/** État d'erreur : phrase qui dit quoi faire + bouton « Réessayer ». */
@Component({
  selector: 'sc-error-state',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div
      role="alert"
      class="flex flex-wrap items-center gap-4 p-5 rounded-lg bg-danger-soft text-ink"
    >
      <span class="text-danger"><sc-icon name="alert" [size]="22" /></span>
      <p class="m-0 flex-[1_1_16rem] text-body-sm">{{ message() }}</p>
      <button scButton type="button" variant="ghost" size="sm" icon="refresh" (click)="retry.emit()">
        Réessayer
      </button>
    </div>
  `,
})
export class ErrorState {
  readonly message = input("Impossible de charger les données. Vérifie ta connexion puis réessaie.");
  readonly retry = output<void>();
}
