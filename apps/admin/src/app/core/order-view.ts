import { formatTnd, refNumber, relativeAge } from './format';
import { OrderSummary } from './models';
import { OrderStatus, carrierLabel, toUiStatus } from './status';

/**
 * Commande telle que l'affichent OrderCard / KanbanBoard
 * (design/components-reference/index.d.ts › Order), plus `key` = id en base.
 */
export interface Order {
  /** Identifiant technique (OrderSummary.id), utilisé pour les routes et les PATCH. */
  key: number;
  /** Numéro affiché « #2948 » (réf sans « SC- »). */
  id: string;
  name: string;
  amount: number;
  city: string;
  status: OrderStatus;
  phone?: string;
  product?: string;
  age?: string;
  carrier?: string;
  tracking?: string;
  createdAt?: string;
}

export function toOrderView(s: OrderSummary, now: number = Date.now()): Order {
  return {
    key: s.id,
    id: refNumber(s.ref),
    name: s.customerName,
    amount: s.amountTnd,
    city: s.governorate,
    status: toUiStatus(s.status),
    phone: s.phone,
    product: s.productName,
    age: relativeAge(s.createdAt, now),
    carrier: carrierLabel(s.carrier),
    tracking: s.trackingNumber ?? undefined,
    createdAt: s.createdAt,
  };
}

/** Libellé accessible d'une carte (sans téléphone). */
export function orderAriaLabel(o: Order): string {
  return `Commande #${o.id}, ${o.name}, ${formatTnd(o.amount)}, ${o.city}`;
}
