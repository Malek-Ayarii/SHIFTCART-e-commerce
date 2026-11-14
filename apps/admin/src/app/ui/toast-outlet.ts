import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';
import { Icon } from './icon';

/** Zone d'annonce des toasts (aria-live), en bas à droite (au-dessus de la barre d'onglets en mobile). */
@Component({
  selector: 'sc-toast-outlet',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class:
      'fixed z-50 right-4 left-4 bottom-22 md:left-auto md:bottom-6 md:right-6 flex flex-col gap-2 md:w-96 pointer-events-none',
    'aria-live': 'polite',
    role: 'status',
  },
  template: `
    @for (t of toasts(); track t.id) {
      <div
        class="pointer-events-auto flex items-start gap-3 p-4 rounded-md shadow-lift text-body-sm"
        [class]="
          t.kind === 'error'
            ? 'bg-danger-soft text-ink'
            : t.kind === 'success'
              ? 'bg-success-soft text-ink'
              : 'bg-ink text-ink-inverse'
        "
      >
        <span
          [class]="t.kind === 'error' ? 'text-danger' : t.kind === 'success' ? 'text-success' : ''"
        >
          <sc-icon [name]="t.kind === 'error' ? 'alert' : 'check'" [size]="18" />
        </span>
        <p class="m-0 flex-1">{{ t.text }}</p>
        <button
          type="button"
          class="-m-3 size-11 shrink-0 grid place-items-center rounded-sm cursor-pointer bg-transparent border-0 text-current"
          aria-label="Fermer le message"
          (click)="toast.dismiss(t.id)"
        >
          <sc-icon name="x" [size]="16" />
        </button>
      </div>
    }
  `,
})
export class ToastOutlet {
  protected readonly toast = inject(ToastService);
  protected readonly toasts = this.toast.toasts;
}
