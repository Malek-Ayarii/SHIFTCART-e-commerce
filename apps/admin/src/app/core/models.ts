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
  // ---- v2 ----
  /** Pack commandé (null si le pack a été supprimé). */
  productId: number | null;
  productSlug: string | null;
  /** `/api/media/{id}` ou null. */
  productCoverUrl: string | null;
  /** Adresse exacte de livraison (donnée personnelle : jamais dans les logs ni les URLs). */
  address: string | null;
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
  /** v2 : filtre par pack. */
  productId?: number | null;
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

// ---------- Stats v2 ----------

export interface ProductStat {
  productId: number;
  name: string;
  orders: number;
  delivered: number;
  returned: number;
  collectedTnd: number;
  sharePct: number;
}

// ---------- Médias & packs (v2) ----------

export interface Media {
  id: number;
  /** `/api/media/{id}` (même origine via le proxy). */
  url: string;
  contentType: string;
  width: number | null;
  height: number | null;
  alt: string | null;
}

export interface Hotspot {
  /** % depuis le bord gauche (0–100). */
  x: number;
  /** % depuis le bord haut (0–100). */
  y: number;
}

export interface PackItem {
  id: number;
  stockItemId: number;
  name: string;
  description: string | null;
  quantity: number;
  gift: boolean;
  photo: Media | null;
  hotspot: Hotspot | null;
}

export interface Savings {
  title: string;
  question: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  homeCostPerDay: number;
  daysPerMonth: number;
}

export type Availability = 'IN_STOCK' | 'MADE_TO_ORDER';

export interface ProductPublic {
  id: number;
  slug: string;
  sku: string;
  name: string;
  badge: string | null;
  tagline: string;
  audience: string | null;
  description: string | null;
  priceTnd: number;
  featured: boolean;
  sortOrder: number;
  cover: Media | null;
  gallery: Media[];
  items: PackItem[];
  savings: Savings | null;
  availability: Availability;
}

export interface ProductAdmin extends ProductPublic {
  active: boolean;
  createdAt: string;
  updatedAt: string;
  completePacks: number;
  assemblablePacks: number;
  ordersThisMonth: number;
}

export interface ProductInput {
  name: string;
  slug?: string;
  sku?: string;
  badge?: string | null;
  tagline: string;
  audience?: string | null;
  description?: string | null;
  priceTnd: number;
  active: boolean;
  featured?: boolean;
  savings: Savings | null;
}

export interface PackItemInput {
  stockItemId: number;
  quantity: number;
  gift: boolean;
  hotspot: Hotspot | null;
}

/** Erreurs 422 : `{ errors: { champ: message } }`. */
export interface ValidationErrorBody {
  errors: Record<string, string>;
}

// ---------- Stock v2 ----------

export type StockItemStatus = 'OK' | 'LOW';

export interface StockUsage {
  productId: number;
  name: string;
  perPack: number;
}

export interface StockItem {
  id: number;
  name: string;
  description: string | null;
  photo: Media | null;
  unitCostTnd: number;
  quantity: number;
  threshold: number;
  status: StockItemStatus;
  usedIn: StockUsage[];
}

export interface StockPack {
  productId: number;
  name: string;
  slug: string;
  active: boolean;
  cover: Media | null;
  completePacks: number;
  assemblablePacks: number;
  packThreshold: number;
  alert: boolean;
  priceTnd: number;
  cogsTnd: number;
  carrierFeeTnd: number;
  marginTnd: number;
  marginPct: number;
}

export interface StockOverview {
  items: StockItem[];
  packs: StockPack[];
  /** Au moins un pack actif sous son seuil. */
  alert: boolean;
  carrierFeeTnd: number;
}

export interface StockItemPatch {
  id: number;
  name?: string;
  description?: string | null;
  /** null = retirer la photo. */
  photoMediaId?: number | null;
  quantity?: number;
  unitCostTnd?: number;
  threshold?: number;
}

export interface StockPatchRequest {
  items: StockItemPatch[];
}

export interface StockItemCreate {
  name: string;
  description?: string | null;
  photoMediaId?: number | null;
  unitCostTnd: number;
  quantity: number;
  threshold: number;
}

export interface AssembleRequest {
  productId: number;
  packs: number;
}
