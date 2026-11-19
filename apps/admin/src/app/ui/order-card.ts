import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { formatTnd } from '../core/format';
import { Order, orderAriaLabel } from '../core/order-view';
import { Button, ButtonVariant } from './button';
import { Icon, IconName } from './icon';
import { PackVisual } from './pack-visual';
import { StatusBadge } from './status-badge';

export type OrderAction = 'whatsapp' | 'remind' | 'print';

export interface OrderActionEvent {
  order: Order;
  action: OrderAction;
  whatsappMessage: string;
}

const ACTIONS: Partial<
  Record<Order['status'], { action: OrderAction; label: string; icon: IconName; variant: ButtonVariant; doneLabel: string }>
> = {
  new: { action: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', variant: 'whatsapp', doneLabel: 'Message prêt' },
  pending: { action: 'remind', label: 'Relancer', icon: 'refresh', variant: 'ghost', doneLabel: 'Relancé' },
  confirmed: { action: 'print', label: 'Imprimer', icon: 'printer', variant: 'dark', doneLabel: 'Bon imprimé' },
};

/** Message WhatsApp pré-rempli (design/components-reference › buildWhatsAppMessage). */
export function buildWhatsAppMessage(order: Pick<Order, 'name' | 'product' | 'city' | 'amount'>): string {
  const first = String(order.name || '').trim().split(/\s+/)[0] || '';
  return (
    'Salut ' + first + ' ! Ton ' + (order.product || 'Pack Barista') + ' pour ' + (order.city || 'ta ville') +
    ' est prêt (' + (order.amount || 89) + ' TND, paiement à la livraison). Réponds OUI pour déclencher la livraison 🚚'
  );
}

/**
 * OrderCard (façon Trello) — étiquette pack, client, badges (réf., ancienneté, ville), montant, ville, ancienneté et UNE action contextuelle :
 * Nouvelles → WhatsApp, En attente → Relancer, Confirmées → Imprimer ; Expédiées → transporteur + n° de suivi.
 */
@Component({
  selector: 'sc-order-card',
  imports: [Button, Icon, PackVisual, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article
      class="group grid gap-2 bg-surface-raised rounded-md p-3 shadow-card relative transition-[box-shadow,opacity] duration-120 hover:shadow-[0_0_0_2px_var(--line-strong)] motion-reduce:transition-none"
      [class.cursor-grab]="draggable()"
      [class.cursor-pointer]="!draggable()"
      [class.opacity-45]="dragging()"
      tabindex="0"
      [attr.data-order-key]="order().key"
      [attr.aria-label]="ariaLabel()"
      (click)="open.emit(order())"
      (keydown.enter)="onEnter($event)"
    >
      <!-- Étiquettes (façon Trello) : pack commandé, statut hors Kanban -->
      @if (order().product || showStatus()) {
        <div class="flex flex-wrap items-center gap-1.5 min-w-0">
          @if (order().product) {
            <span
              class="inline-flex items-center gap-1.5 max-w-full h-6 pl-0.5 pr-2 rounded-sm bg-surface-sunken text-xs font-bold text-ink"
              data-testid="order-product"
            >
              <sc-pack-visual
                class="size-5 shrink-0 rounded-xs"
                [url]="order().productCover"
                [name]="order().product!"
                [compact]="true"
              />
              <span class="truncate">{{ order().product }}</span>
            </span>
          }
          @if (showStatus()) {
            <sc-status-badge [status]="order().status" />
          }
        </div>
      }

      <p class="m-0 text-title font-bold leading-5">{{ order().name }}</p>

      <!-- Badges : référence, ancienneté, ville — montant à droite -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-muted">
        <span class="font-display font-extrabold text-ink">#{{ order().id }}</span>
        @if (order().age) {
          <span class="inline-flex items-center gap-1"><sc-icon name="clock" [size]="13" />{{ order().age }}</span>
        }
        <span class="inline-flex items-center gap-1 min-w-0"><sc-icon name="pin" [size]="13" /><span class="truncate">{{ order().city }}</span></span>
        <span class="ml-auto text-sm font-extrabold text-ink whitespace-nowrap">{{ amount() }}</span>
      </div>

      @if (order().status === 'shipped') {
        <span
          class="inline-flex items-center gap-1.5 h-7 px-2 rounded-sm bg-info-soft text-xs font-bold text-info justify-self-start"
        >
          <sc-icon name="truck" [size]="14" />{{ order().carrier || 'Yalidine' }}{{
            order().tracking ? ' · ' + order().tracking : ''
          }}
        </span>
      } @else if (act(); as a) {
        <button
          scButton
          type="button"
          size="sm"
          class="w-full mt-0.5"
          [variant]="a.variant"
          [icon]="done() ? 'check' : a.icon"
          (click)="run($event)"
          (keydown.enter)="$event.stopPropagation()"
        >
          {{ done() ? a.doneLabel : a.label }}
        </button>
      }
    </article>
  `,
})
export class OrderCard {
  readonly order = input.required<Order>();
  readonly draggable = input(false);
  readonly showStatus = input(false);
  readonly dragging = input(false);

  readonly action = output<OrderActionEvent>();
  readonly open = output<Order>();

  protected readonly done = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly act = computed(() => ACTIONS[this.order().status]);
  protected readonly amount = computed(() => formatTnd(this.order().amount));
  protected readonly ariaLabel = computed(
    () =>
      orderAriaLabel(this.order()) +
      (this.draggable() ? '. Flèches gauche et droite pour changer de colonne.' : ''),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onEnter(event: Event): void {
    if (event.target === event.currentTarget) this.open.emit(this.order());
  }

  protected run(event: Event): void {
    event.stopPropagation();
    const a = this.act();
    if (!a) return;
    this.done.set(true);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.done.set(false), 1800);
    this.action.emit({ order: this.order(), action: a.action, whatsappMessage: buildWhatsAppMessage(this.order()) });
  }
}
