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
 * OrderCard — ID, client, montant, ville, ancienneté et UNE action contextuelle :
 * Nouvelles → WhatsApp, En attente → Relancer, Confirmées → Imprimer ; Expédiées → transporteur + n° de suivi.
 */
@Component({
  selector: 'sc-order-card',
  imports: [Button, Icon, PackVisual, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article
      class="grid gap-2 bg-surface-raised rounded-md pt-3 px-4 pb-4 shadow-card relative transition-[transform,box-shadow,opacity] duration-120 hover:shadow-lift motion-reduce:transition-none"
      [class.cursor-grab]="draggable()"
      [class.cursor-pointer]="!draggable()"
      [class.opacity-45]="dragging()"
      tabindex="0"
      [attr.data-order-key]="order().key"
      [attr.aria-label]="ariaLabel()"
      (click)="open.emit(order())"
      (keydown.enter)="onEnter($event)"
    >
      <div class="flex items-center gap-2">
        @if (draggable()) {
          <span class="text-line-strong -ml-1"><sc-icon name="grip" [size]="16" /></span>
        }
        <span class="font-display font-extrabold text-base">#{{ order().id }}</span>
        @if (showStatus()) {
          <sc-status-badge [status]="order().status" />
        }
        @if (order().age) {
          <span class="ml-auto text-xs font-semibold text-ink-muted">{{ order().age }}</span>
        }
      </div>
      <p class="m-0 text-title font-bold">{{ order().name }}</p>
      @if (order().product) {
        <div class="flex items-center gap-2 min-w-0 text-sm font-semibold text-ink" data-testid="order-product">
          <sc-pack-visual
            class="size-7 shrink-0 rounded-xs"
            [url]="order().productCover"
            [name]="order().product!"
            [compact]="true"
          />
          <span class="truncate">{{ order().product }}</span>
        </div>
      }
      <div class="flex items-center gap-3 text-sm font-semibold text-ink-muted">
        <span class="text-ink font-extrabold">{{ amount() }}</span>
        <span class="inline-flex items-center gap-1"><sc-icon name="pin" [size]="14" />{{ order().city }}</span>
      </div>
      @if (order().status === 'shipped') {
        <span class="inline-flex items-center gap-1.5 text-label tracking-normal text-info">
          <sc-icon name="truck" [size]="16" />{{ order().carrier || 'Yalidine' }}{{
            order().tracking ? ' · ' + order().tracking : ''
          }}
        </span>
      } @else if (act(); as a) {
        <div class="flex gap-2 mt-1">
          <button
            scButton
            type="button"
            size="sm"
            class="flex-1"
            [variant]="a.variant"
            [icon]="done() ? 'check' : a.icon"
            (click)="run($event)"
            (keydown.enter)="$event.stopPropagation()"
          >
            {{ done() ? a.doneLabel : a.label }}
          </button>
        </div>
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
