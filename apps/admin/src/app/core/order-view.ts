import { formatTnd, refNumber, relativeAge } from './format';
import { OrderDetail, OrderSummary } from './models';
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
  /** Vignette du pack (`/api/media/{id}`), v2. */
  productCover?: string | null;
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
    productCover: s.productCoverUrl ?? null,
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

/** Réduit un OrderDetail (réponse du PATCH) à la forme OrderSummary des listes. */
export function toSummary(d: OrderDetail): OrderSummary {
  return {
    id: d.id,
    ref: d.ref,
    customerName: d.customerName,
    phone: d.phone,
    governorate: d.governorate,
    productName: d.productName,
    quantity: d.quantity,
    amountTnd: d.amountTnd,
    status: d.status,
    carrier: d.carrier,
    trackingNumber: d.trackingNumber,
    source: d.source,
    createdAt: d.createdAt,
    productId: d.productId ?? null,
    productSlug: d.productSlug ?? null,
    productCoverUrl: d.productCoverUrl ?? null,
    address: d.address ?? null,
  };
}
