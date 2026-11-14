import type { ApiError, CreateOrderRequest, CreateOrderResponse, TrackingResponse } from "./types";
import type { CheckoutErrors } from "./validation";

/**
 * Server-side client of apps/api (never imported by Client Components: API_URL is private).
 * Logs never contain the customer's phone or name: only status codes and refs.
 */
export function apiUrl(): string {
  return (process.env.API_URL || "http://localhost:8090").replace(/\/+$/, "");
}

const TIMEOUT_MS = 10_000;

export type CreateOrderResult =
  | { kind: "ok"; order: CreateOrderResponse }
  | { kind: "invalid"; errors: CheckoutErrors }
  | { kind: "rate_limited"; message: string }
  | { kind: "error"; status?: number };

export const RATE_LIMIT_MESSAGE = "Trop de tentatives. Réessaie dans quelques minutes.";

async function readJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function pickFieldErrors(body: unknown): CheckoutErrors {
  const out: CheckoutErrors = {};
  const errors = (body as { errors?: Record<string, unknown> } | null)?.errors;
  if (!errors || typeof errors !== "object") return out;
  for (const key of ["customerName", "phone", "governorate"] as const) {
    const v = errors[key];
    if (typeof v === "string" && v) out[key] = v;
  }
  return out;
}

function isCreateOrderResponse(body: unknown): body is CreateOrderResponse {
  const b = body as Partial<CreateOrderResponse> | null;
  return !!b && typeof b.ref === "string" && typeof b.trackingToken === "string";
}

export async function createOrder(
  payload: CreateOrderRequest,
  init: { forwardedFor?: string | null } = {},
): Promise<CreateOrderResult> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.forwardedFor ? { "X-Forwarded-For": init.forwardedFor } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    console.error("[shop] POST /api/orders failed: network error");
    return { kind: "error" };
  }

  const body = await readJson(res);
  if ((res.status === 201 || res.status === 200) && isCreateOrderResponse(body)) {
    return { kind: "ok", order: body };
  }
  if (res.status === 422) {
    const errors = pickFieldErrors(body);
    if (Object.keys(errors).length > 0) return { kind: "invalid", errors };
  }
  if (res.status === 429) {
    const message = (body as Partial<ApiError> | null)?.message;
    return { kind: "rate_limited", message: typeof message === "string" && message ? message : RATE_LIMIT_MESSAGE };
  }
  console.error(`[shop] POST /api/orders failed: HTTP ${res.status}`);
  return { kind: "error", status: res.status };
}

export type TrackingResult =
  | { kind: "ok"; tracking: TrackingResponse }
  | { kind: "forbidden" }
  | { kind: "not_found" };

/** Throws on network / 5xx errors so the route's error boundary can offer a retry. */
export async function getTracking(ref: string, token: string): Promise<TrackingResult> {
  const url = `${apiUrl()}/api/orders/${encodeURIComponent(ref)}/tracking?t=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 403 || res.status === 401) return { kind: "forbidden" };
  if (res.status === 404) return { kind: "not_found" };
  if (!res.ok) {
    console.error(`[shop] GET tracking ${ref} failed: HTTP ${res.status}`);
    throw new Error(`Tracking request failed (${res.status})`);
  }
  const tracking = (await res.json()) as TrackingResponse;
  if (!tracking || !Array.isArray(tracking.steps)) throw new Error("Malformed tracking response");
  return { kind: "ok", tracking };
}
