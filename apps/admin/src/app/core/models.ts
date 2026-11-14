/**
 * Formes JSON exactes de docs/CONTRACT.md (API ⇄ admin). Ne pas renommer de champ.
 */

export type ApiOrderStatus =
  | 'NEW'
  | 'PENDING'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURNED'
  | 'CANCELLED';

export const API_ORDER_STATUSES: readonly ApiOrderStatus[] = [
  'NEW',
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
];

export interface ApiErrorBody {
  error: string;
  message: string;
}

// ---------- Auth ----------

export type UserRole = 'ADMIN' | 'AGENT';

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AdminUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ---------- Commandes ----------

export interface OrderSummary {
  id: number;
  ref: string;
  customerName: string;
  phone: string;
  governorate: string;
  productName: string;
  quantity: number;
  amountTnd: number;
  status: ApiOrderStatus;
  carrier: string | null;
  trackingNumber: string | null;
  source: string | null;
  createdAt: string;
}

export interface OrderEvent {
  id: number;
  fromStatus: ApiOrderStatus | null;
  toStatus: ApiOrderStatus;
  actor: string;
  note: string | null;
  createdAt: string;
}

export type MessageTone = 'amical' | 'direct' | 'relance';
export type MessageDirection = 'OUT' | 'IN';
export type MessageStatus = 'SENT' | 'FAILED' | 'SIMULATED' | (string & {});

export interface OrderMessage {
  id: number;
  direction: MessageDirection;
  channel: string;
  tone: MessageTone | null;
  body: string;
  status: MessageStatus;
  createdAt: string;
}

export interface OrderDetail extends OrderSummary {
  productSku: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  returnedAt: string | null;
  events: OrderEvent[];
  messages: OrderMessage[];
  allowedTransitions: ApiOrderStatus[];
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type OrderCounts = Record<ApiOrderStatus, number>;

export interface OrderListQuery {
  status?: ApiOrderStatus[];
  q?: string;
  month?: string;
  page?: number;
  size?: number;
}

export interface StatusUpdateRequest {
  status: ApiOrderStatus;
  carrier?: string;
  trackingNumber?: string;
  note?: string;
}

export interface GenerateMessageRequest {
  tone: MessageTone;
}

export interface GeneratedMessage {
  body: string;
}

export interface SendMessageRequest {
  body: string;
}

// ---------- Stats ----------

export interface KpiStats {
  month: string;
  orders: number;
  ordersDeltaPct: number | null;
  revenueTnd: number;
  revenueDeltaPct: number | null;
  returnRatePct: number;
  returnRateDeltaPts: number | null;
  toConfirm: number;
}

export interface WeeklyFinance {
  label: string;
  orderedTnd: number;
  collectedTnd: number;
}

export interface FinanceStats {
  month: string;
  orderedTnd: number;
  collectedTnd: number;
  collectionRatePct: number;
  returnsTnd: number;
  inProgressTnd: number;
  carrierFeesTnd: number;
  shippedParcels: number;
  netTnd: number;
  carrierFeeTnd: number;
  weekly: WeeklyFinance[];
}

export interface GovernorateStat {
  governorate: string;
  orders: number;
  delivered: number;
  returned: number;
  collectedTnd: number;
  sharePct: number;
}

// ---------- Stock ----------

export type StockItemStatus = 'OK' | 'LOW';

export interface StockItem {
  id: number;
  name: string;
  unitCostTnd: number;
  quantity: number;
  threshold: number;
  perPack: number;
  status: StockItemStatus;
}

export interface StockOverview {
  items: StockItem[];
  completePacks: number;
  packThreshold: number;
  alert: boolean;
  assemblablePacks: number;
  packPriceTnd: number;
  cogsTnd: number;
  carrierFeeTnd: number;
  marginTnd: number;
  marginPct: number;
}

export interface StockItemPatch {
  id: number;
  quantity?: number;
  unitCostTnd?: number;
  threshold?: number;
}

export interface StockPatchRequest {
  items: StockItemPatch[];
}

export interface AssembleRequest {
  packs: number;
}
