import { z } from "zod";
import {
  type CheckoutErrors,
  isGovernorate,
  MESSAGES,
  normalizeAddress,
  phoneDigits,
  validateAddress,
  validateName,
  validateTnPhone,
} from "./validation";

/** PACK-BARISTA, PACK-SETUP… (generated `PACK-<SLUG>` by the API). */
export const PRODUCT_SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,63}$/;

/** Server-only: zod schema of the checkout payload (kept out of the client bundle). */

const utmValue = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((v) => (v ? v : undefined));

export const sourceSchema = z
  .object({ utmSource: utmValue, utmCampaign: utmValue, utmContent: utmValue })
  .partial()
  .optional();

/**
 * Server-side schema of the checkout payload (docs/CONTRACT.md › POST /api/orders).
 * Each field reuses the functions above so client and server messages never drift.
 */
export const orderInputSchema = z.object({
  customerName: z
    .string()
    .superRefine((v, ctx) => {
      const msg = validateName(v);
      if (msg) ctx.addIssue({ code: "custom", message: msg });
    })
    .transform((v) => v.trim().replace(/\s+/g, " ")),
  phone: z
    .string()
    .superRefine((v, ctx) => {
      const msg = validateTnPhone(v);
      if (msg) ctx.addIssue({ code: "custom", message: msg });
    })
    .transform((v) => phoneDigits(v)),
  governorate: z.string().refine(isGovernorate, { message: MESSAGES.governorate }),
  // Validated AFTER normalisation: joining lines with ", " can lengthen the text, and the API
  // checks the 10–200 rule on exactly what it receives.
  address: z
    .string()
    .transform((v) => normalizeAddress(v))
    .superRefine((v, ctx) => {
      const msg = validateAddress(v);
      if (msg) ctx.addIssue({ code: "custom", message: msg });
    }),
  /** SKU of the pack shown on the page (the API re-checks it is active). */
  productSku: z.string().regex(PRODUCT_SKU_PATTERN, { message: MESSAGES.productUnavailable }),
  source: sourceSchema,
  website: z.string().max(200).optional().default(""),
});
export type OrderInput = z.input<typeof orderInputSchema>;
export type ParsedOrderInput = z.output<typeof orderInputSchema>;

/** Turns zod issues into the `{ field: message }` shape used by the API (422) and the form. */
export function errorsFromZod(error: z.ZodError): CheckoutErrors & { productSku?: string } {
  const out: CheckoutErrors & { productSku?: string } = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (
      (key === "customerName" || key === "phone" || key === "governorate" || key === "address" || key === "productSku") &&
      !out[key]
    ) {
      out[key] = issue.message;
    }
  }
  return out;
}

/** Coerces an untrusted payload (Server Action argument) into the schema's input shape. */
export function normalizeOrderPayload(raw: unknown): OrderInput {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const src = (r.source && typeof r.source === "object" ? r.source : {}) as Record<string, unknown>;
  return {
    customerName: str(r.customerName),
    phone: str(r.phone),
    governorate: str(r.governorate),
    address: str(r.address).slice(0, 2000),
    productSku: str(r.productSku).trim().toUpperCase().slice(0, 64),
    website: str(r.website).slice(0, 200),
    source: {
      utmSource: str(src.utmSource).trim().slice(0, 100) || undefined,
      utmCampaign: str(src.utmCampaign).trim().slice(0, 100) || undefined,
      utmContent: str(src.utmContent).trim().slice(0, 100) || undefined,
    },
  };
}

