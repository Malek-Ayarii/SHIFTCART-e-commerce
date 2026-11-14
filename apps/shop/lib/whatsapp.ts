/**
 * WhatsApp links (docs/API.md › Flux WhatsApp). The shop number comes from
 * NEXT_PUBLIC_WHATSAPP_NUMBER (21692184592 = +216 92 184 592, docs/CONTRACT.md › v2).
 */
export function shopWhatsAppNumber(): string | null {
  const raw = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  return raw.length >= 8 ? raw : null;
}

export function waLink(number: string, text?: string): string {
  const base = `https://wa.me/${number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function confirmText(ref: string): string {
  return `Je confirme ma commande ${ref}`;
}

/** wa.me link the customer uses to confirm; null when the shop number is not configured. */
export function confirmOrderUrl(ref: string, number: string | null = shopWhatsAppNumber()): string | null {
  return number ? waLink(number, confirmText(ref)) : null;
}

/**
 * Only accept https://wa.me/<number> (or api.whatsapp.com/send?phone=<number>) links coming back
 * from the API. While WHATSAPP_SHOP_NUMBER is [À DÉFINIR] the API returns a number-less
 * `https://wa.me/?text=…`, which opens a contact picker: rejected, so the shop falls back to
 * NEXT_PUBLIC_WHATSAPP_NUMBER or its [À DÉFINIR] note.
 */
export function isSafeWhatsAppUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (u.hostname === "wa.me") return /^\/\d{8,15}$/.test(u.pathname);
    if (u.hostname === "api.whatsapp.com") return /^\d{8,15}$/.test(u.searchParams.get("phone") ?? "");
    return false;
  } catch {
    return false;
  }
}

/** Contact link (« Une question ? Écris-nous »). Falls back to the help page while the number is [À DÉFINIR]. */
export function contactUrl(number: string | null = shopWhatsAppNumber()): string {
  return number ? waLink(number) : "/livraison#contact";
}

/** Message written by the shop (reference ShiftCart.utils.buildWhatsAppMessage). */
export function buildWhatsAppMessage(order: { name?: string; product?: string; city?: string; amount?: number }): string {
  const first = String(order.name ?? "").trim().split(/\s+/)[0] ?? "";
  return `Salut ${first} ! Ton ${order.product ?? "Pack Barista"} pour ${order.city ?? "ta ville"} est prêt (${order.amount ?? 89} TND, paiement à la livraison). Réponds OUI pour déclencher la livraison 🚚`;
}

/** "21692184592" → "+216 92 184 592" (other formats are returned with a leading +). */
export function formatShopPhone(number: string | null): string {
  if (!number) return "[À DÉFINIR]";
  const m = number.match(/^216(\d{2})(\d{3})(\d{3})$/);
  return m ? `+216 ${m[1]} ${m[2]} ${m[3]}` : `+${number}`;
}

/** Shop WhatsApp number as shown in the footer and the menu (+216 92 184 592). */
export const SHOP_PHONE_DISPLAY = formatShopPhone(shopWhatsAppNumber());
