import { ApiOrderStatus } from './models';
import type { IconName } from '../ui/icon';

/** Statuts côté composants (design/components-reference : `new | pending | …`). */
export type OrderStatus =
  | 'new'
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled';

export interface StatusMeta {
  /** Libellé du badge (« Nouvelle »). */
  label: string;
  /** Titre de colonne Kanban (« Nouvelles »). */
  lane: string;
  icon: IconName;
  /** Classes du badge : fond *-soft + texte de la couleur du statut. */
  badgeClass: string;
  /** Pastille de couleur en tête de colonne. */
  dotClass: string;
}

export const STATUS_META: Record<OrderStatus, StatusMeta> = {
  new: {
    label: 'Nouvelle',
    lane: 'Nouvelles',
    icon: 'zap',
    badgeClass: 'bg-orange-soft text-orange-ink',
    dotClass: 'bg-orange',
  },
  pending: {
    label: 'En attente',
    lane: 'En attente',
    icon: 'clock',
    badgeClass: 'bg-warning-soft text-warning',
    dotClass: 'bg-warning',
  },
  confirmed: {
    label: 'Confirmée',
    lane: 'Confirmées',
    icon: 'check',
    badgeClass: 'bg-success-soft text-success',
    dotClass: 'bg-success',
  },
  shipped: {
    label: 'Expédiée',
    lane: 'Expédiées',
    icon: 'truck',
    badgeClass: 'bg-info-soft text-info',
    dotClass: 'bg-info',
  },
  delivered: {
    label: 'Livrée',
    lane: 'Livrées',
    icon: 'banknote',
    badgeClass: 'bg-success-soft text-success',
    dotClass: 'bg-success',
  },
  returned: {
    label: 'Retournée',
    lane: 'Retournées',
    icon: 'undo',
    badgeClass: 'bg-danger-soft text-danger',
    dotClass: 'bg-danger',
  },
  cancelled: {
    label: 'Annulée',
    lane: 'Annulées',
    icon: 'x',
    badgeClass: 'bg-surface-sunken text-ink-muted',
    dotClass: 'bg-ink-muted',
  },
};

/** Colonnes du Kanban, dans l'ordre du pipeline COD. */
export const KANBAN_LANES: readonly OrderStatus[] = ['new', 'pending', 'confirmed', 'shipped'];

const API_TO_UI: Record<ApiOrderStatus, OrderStatus> = {
  NEW: 'new',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
};

const UI_TO_API: Record<OrderStatus, ApiOrderStatus> = {
  new: 'NEW',
  pending: 'PENDING',
  confirmed: 'CONFIRMED',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  returned: 'RETURNED',
  cancelled: 'CANCELLED',
};

export function toUiStatus(status: ApiOrderStatus): OrderStatus {
  return API_TO_UI[status];
}

export function toApiStatus(status: OrderStatus): ApiOrderStatus {
  return UI_TO_API[status];
}

/** Transitions autorisées (docs/CONTRACT.md › PATCH /status). Identiques côté API. */
export const TRANSITIONS: Record<ApiOrderStatus, readonly ApiOrderStatus[]> = {
  NEW: ['CONFIRMED', 'PENDING', 'CANCELLED'],
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[toApiStatus(from)].includes(toApiStatus(to));
}

/** Message affiché quand un déplacement est refusé. */
export function transitionRejectedMessage(from: OrderStatus, to: OrderStatus): string {
  return `Impossible de passer une commande « ${STATUS_META[from].label} » en « ${STATUS_META[to].label} ».`;
}

/** Libellé d'action pour une transition (détail commande). */
export const TRANSITION_ACTION: Record<
  ApiOrderStatus,
  { label: string; icon: IconName; variant: 'dark' | 'ghost' }
> = {
  NEW: { label: 'Remettre en nouvelle', icon: 'zap', variant: 'ghost' },
  PENDING: { label: 'Mettre en attente', icon: 'clock', variant: 'ghost' },
  CONFIRMED: { label: 'Marquer confirmée', icon: 'check', variant: 'dark' },
  SHIPPED: { label: 'Expédier', icon: 'truck', variant: 'dark' },
  DELIVERED: { label: 'Marquer livrée', icon: 'banknote', variant: 'dark' },
  RETURNED: { label: 'Marquer retournée', icon: 'undo', variant: 'ghost' },
  CANCELLED: { label: 'Annuler', icon: 'x', variant: 'ghost' },
};

/** Transporteurs connus (docs/API.md). Le code part à l'API, le libellé s'affiche. */
export const CARRIERS: readonly { code: string; label: string }[] = [
  { code: 'YALIDINE', label: 'Yalidine' },
  { code: 'BOSTA', label: 'Bosta' },
];
export const DEFAULT_CARRIER = 'YALIDINE';

export function carrierLabel(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  const known = CARRIERS.find((c) => c.code === code.toUpperCase());
  if (known) return known.label;
  return code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
}
