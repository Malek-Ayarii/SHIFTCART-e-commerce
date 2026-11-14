"use server";

import { cookies, headers } from "next/headers";
import { createOrder, RATE_LIMIT_MESSAGE, type OrderErrors } from "@/lib/api";
import { mediaSrc } from "@/lib/catalog-map";
import { cookieOptions, encodeOrderCookie, ORDER_COOKIE } from "@/lib/order-cookie";
import { errorsFromZod, normalizeOrderPayload, orderInputSchema } from "@/lib/order-schema";
import { isSafeWhatsAppUrl } from "@/lib/whatsapp";

export type SubmitOrderResult =
  | { status: "ok"; ref: string }
  | { status: "invalid"; errors: OrderErrors }
  | { status: "rate_limited"; message: string }
  | { status: "error" };

/**
 * Checkout Server Action: re-validates with zod (same rules as the form, 4 fields + the SKU of
 * the displayed pack), then calls POST {API_URL}/api/orders server-side. On success the
 * confirmation data goes into the httpOnly `sc_order` cookie (1 h) so neither the phone nor the
 * address ever appears in a URL. The address is never stored in the cookie nor logged.
 */
export async function submitOrder(raw: unknown): Promise<SubmitOrderResult> {
  const parsed = orderInputSchema.safeParse(normalizeOrderPayload(raw));
  if (!parsed.success) {
    return { status: "invalid", errors: errorsFromZod(parsed.error) };
  }
  const input = parsed.data;
  const source = input.source && Object.values(input.source).some(Boolean) ? input.source : undefined;

  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for") ?? h.get("x-real-ip");

  const result = await createOrder(
    {
      customerName: input.customerName,
      phone: input.phone,
      governorate: input.governorate,
      address: input.address,
      productSku: input.productSku,
      quantity: 1,
      ...(source ? { source } : {}),
      website: input.website,
    },
    { forwardedFor },
  );

  switch (result.kind) {
    case "ok": {
      const o = result.order;
      const jar = await cookies();
      jar.set(
        ORDER_COOKIE,
        encodeOrderCookie({
          ref: o.ref,
          customerFirstName: o.customerFirstName,
          phoneDisplay: o.phoneDisplay,
          trackingToken: o.trackingToken,
          whatsappConfirmUrl: isSafeWhatsAppUrl(o.whatsappConfirmUrl) ? o.whatsappConfirmUrl : null,
          governorate: o.governorate,
          amountTnd: o.amountTnd,
          productName: o.productName,
          productSlug: o.productSlug ?? undefined,
          productCoverSrc: mediaSrc(o.productCoverUrl) ?? undefined,
        }),
        cookieOptions,
      );
      return { status: "ok", ref: o.ref };
    }
    case "invalid":
      return { status: "invalid", errors: result.errors };
    case "rate_limited":
      return { status: "rate_limited", message: result.message || RATE_LIMIT_MESSAGE };
    default:
      return { status: "error" };
  }
}
