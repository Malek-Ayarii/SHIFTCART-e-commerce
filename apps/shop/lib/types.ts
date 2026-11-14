/** JSON shapes of docs/CONTRACT.md (authoritative field names). */
export type ApiOrderStatus = "NEW" | "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "RETURNED" | "CANCELLED";
export type UiOrderStatus = "new" | "pending" | "confirmed" | "shipped" | "delivered" | "returned" | "cancelled";

export function toUiStatus(s: ApiOrderStatus): UiOrderStatus {
  return s.toLowerCase() as UiOrderStatus;
}

export interface OrderSource {
  utmSource?: string;
  utmCampaign?: string;
  utmContent?: string;
}

export interface CreateOrderRequest {
  customerName: string;
  phone: string;
  governorate: string;
  productSku: string;
  quantity: 1;
  source?: OrderSource;
  website: string;
}

export interface CreateOrderResponse {
  ref: string;
  amountTnd: number;
  status: ApiOrderStatus;
  productName: string;
  customerFirstName: string;
  phoneDisplay: string;
  governorate: string;
  trackingToken: string;
  whatsappConfirmUrl: string;
  trackingUrl: string;
}

export type TrackingStepKey = "RECEIVED" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | (string & {});
export type TrackingStepState = "done" | "current" | "upcoming" | "cancelled";

export interface TrackingStep {
  key: TrackingStepKey;
  label: string;
  state: TrackingStepState;
  at: string | null;
  detail?: string | null;
}

export interface TrackingResponse {
  ref: string;
  status: ApiOrderStatus;
  productName: string;
  amountTnd: number;
  governorate: string;
  customerFirstName?: string;
  carrier: string | null;
  trackingNumber: string | null;
  eta: string | null;
  steps: TrackingStep[];
}

export interface ApiError {
  error: string;
  message: string;
}

/** Order reference format: SC- followed by digits. */
export const REF_PATTERN = /^SC-\d{1,12}$/;

/** Route param → normalised ref, or null when malformed (bad %-escape or not SC-digits). */
export function parseRef(raw: string): string | null {
  let ref: string;
  try {
    ref = decodeURIComponent(raw).toUpperCase();
  } catch {
    return null;
  }
  return REF_PATTERN.test(ref) ? ref : null;
}
