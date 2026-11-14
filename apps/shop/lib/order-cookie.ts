import { mediaSrc } from "./catalog-map";
import { REF_PATTERN } from "./types";

/**
 * Short-lived httpOnly cookie that lets /merci/[ref] greet the customer without
 * ever putting the phone number in the URL (docs/CONTRACT.md › POST /api/orders).
 */
export const ORDER_COOKIE = "sc_order";
export const ORDER_COOKIE_MAX_AGE = 60 * 60; // 1 h

export interface OrderCookie {
  ref: string;
  customerFirstName: string;
  phoneDisplay: string;
  trackingToken: string;
  whatsappConfirmUrl: string | null;
  governorate?: string;
  amountTnd?: number;
  productName?: string;
  productSlug?: string;
  /** Same-origin thumbnail (`/media/{id}`), never the address. */
  productCoverSrc?: string;
}

export function encodeOrderCookie(data: OrderCookie): string {
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

export function decodeOrderCookie(value: string | undefined | null): OrderCookie | null {
  if (!value) return null;
  try {
    const data = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<OrderCookie>;
    if (typeof data.ref !== "string" || !REF_PATTERN.test(data.ref)) return null;
    if (typeof data.trackingToken !== "string") return null;
    return {
      ref: data.ref,
      customerFirstName: typeof data.customerFirstName === "string" ? data.customerFirstName : "",
      phoneDisplay: typeof data.phoneDisplay === "string" ? data.phoneDisplay : "",
      trackingToken: data.trackingToken,
      whatsappConfirmUrl: typeof data.whatsappConfirmUrl === "string" ? data.whatsappConfirmUrl : null,
      governorate: typeof data.governorate === "string" ? data.governorate : undefined,
      amountTnd: typeof data.amountTnd === "number" ? data.amountTnd : undefined,
      productName: typeof data.productName === "string" ? data.productName : undefined,
      productSlug: typeof data.productSlug === "string" && /^[a-z0-9-]{1,100}$/.test(data.productSlug) ? data.productSlug : undefined,
      productCoverSrc: mediaSrc(data.productCoverSrc) ?? undefined,
    };
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ORDER_COOKIE_MAX_AGE,
};
