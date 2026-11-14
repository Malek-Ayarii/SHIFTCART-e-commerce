import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CARRIERS, DEFAULT_CARRIER } from '../core/status';
import { Button } from './button';
import { Icon } from './icon';

export interface ShipInfo {
  carrier: string;
  trackingNumber?: string;
}

/**
 * Petite fenêtre modale (<dialog> natif : focus piégé, Échap) demandée au passage en « Expédiée » :
 * transporteur (Yalidine par défaut) + n° de suivi.
 */
@Component({
  selector: 'sc-ship-dialog',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dlg
      class="m-auto w-[min(100%-2rem,28rem)] p-0 rounded-lg bg-surface-raised text-ink shadow-sheet border-0 backdrop:bg-scrim"
      aria-labelledby="ship-title"
      (cancel)="onCancel($event)"
    >
      <form class="flex flex-col gap-4 p-6" (submit)="submit($event)">
        <div class="flex items-center gap-3">
          <span class="size-9 rounded-sm bg-info-soft text-info grid place-items-center">
            <sc-icon name="truck" [size]="18" />
          </span>
          <h2 id="ship-title" class="m-0 text-heading">Expédier #{{ refLabel() }}</h2>
        </div>
        <label class="flex flex-col gap-1.5 text-sm font-bold" for="ship-carrier">
          Transporteur
          <select
            id="ship-carrier"
            class="h-12 px-3 rounded-md border-[1.5px] border-line-strong bg-surface-raised text-ink text-base font-semibold"
            [value]="carrier()"
            (change)="carrier.set($any($event.target).value)"
          >
            @for (c of carriers; track c.code) {
              <option [value]="c.code" [selected]="c.code === carrier()">{{ c.label }}</option>
            }
          </select>
        </label>
        <label class="flex flex-col gap-1.5 text-sm font-bold" for="ship-tracking">
          N° de suivi
          <input
            id="ship-tracking"
            type="text"
            autocomplete="off"
            class="h-12 px-3 rounded-md border-[1.5px] border-line-strong bg-surface-raised text-ink text-base font-semibold"
            placeholder="YAL-88213"
            [value]="tracking()"
            (input)="tracking.set($any($event.target).value)"
          />
          <span class="text-xs font-semibold text-ink-muted"
            >Facultatif : tu pourras l'ajouter plus tard.</span
          >
        </label>
        <div class="flex flex-wrap justify-end gap-2 pt-2">
          <button scButton type="button" variant="ghost" (click)="close()">Annuler</button>
          <button scButton type="submit" variant="dark" icon="truck">Marquer expédiée</button>
        </div>
      </form>
    </dialog>
  `,
})
export class ShipDialog {
  /** Ouvre la fenêtre quand non nul. */
  readonly refLabel = input<string | null>(null);
  readonly confirmed = output<ShipInfo>();
  readonly cancelled = output<void>();

  protected readonly carriers = CARRIERS;
  protected readonly carrier = signal(DEFAULT_CARRIER);
  protected readonly tracking = signal('');

  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dlg().nativeElement;
      if (this.refLabel() != null) {
        this.carrier.set(DEFAULT_CARRIER);
        this.tracking.set('');
        if (!el.open) {
          if (typeof el.showModal === 'function') el.showModal();
          else el.setAttribute('open', '');
        }
      } else if (el.open) {
        el.close();
      }
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const trackingNumber = this.tracking().trim();
    this.confirmed.emit({ carrier: this.carrier(), ...(trackingNumber ? { trackingNumber } : {}) });
  }

  protected onCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  protected close(): void {
    this.cancelled.emit();
  }
}
