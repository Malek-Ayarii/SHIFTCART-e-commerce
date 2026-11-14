import { cacheLife, cacheTag } from "next/cache";
import { apiUrl } from "./api";
import { toPack, type ApiProductPublic, type Pack } from "./catalog-map";

/**
 * Server-side catalogue reads (GET /api/products, /api/products/{slug}) cached with
 * `use cache` + cacheLife: the Cache Components equivalent of ISR `revalidate: 60`.
 * Never throws: a failure is a value, so `next build` succeeds with the API down and the
 * pages render a graceful « catalogue indisponible » state, retried after 30 s.
 */

const TIMEOUT_MS = 8_000;

export type CatalogResult = { ok: true; packs: Pack[] } | { ok: false };
export type PackResult = { kind: "ok"; pack: Pack } | { kind: "not_found" } | { kind: "error" };

async function fetchJson(path: string): Promise<{ status: number; body: unknown } | null> {
  try {
    const res = await fetch(`${apiUrl()}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch {
    return null;
  }
}

function isProduct(v: unknown): v is ApiProductPublic {
  const p = v as Partial<ApiProductPublic> | null;
  return !!p && typeof p.slug === "string" && typeof p.sku === "string" && typeof p.name === "string";
}

export async function getCatalog(): Promise<CatalogResult> {
  "use cache";
  cacheTag("catalog");
  const res = await fetchJson("/api/products");
  if (!res || res.status !== 200 || !Array.isArray(res.body)) {
    console.error(`[shop] GET /api/products failed${res ? `: HTTP ${res.status}` : ": network error"}`);
    cacheLife({ stale: 30, revalidate: 30, expire: 600 });
    return { ok: false };
  }
  cacheLife({ stale: 60, revalidate: 60, expire: 86_400 });
  return { ok: true, packs: res.body.filter(isProduct).map(toPack) };
}

export async function getPack(slug: string): Promise<PackResult> {
  "use cache";
  cacheTag("catalog", `pack:${slug}`);
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) {
    cacheLife({ stale: 60, revalidate: 60, expire: 86_400 });
    return { kind: "not_found" };
  }
  const res = await fetchJson(`/api/products/${encodeURIComponent(slug)}`);
  if (res && res.status === 404) {
    cacheLife({ stale: 60, revalidate: 60, expire: 86_400 });
    return { kind: "not_found" };
  }
  if (!res || res.status !== 200 || !isProduct(res.body)) {
    console.error(`[shop] GET /api/products/${slug} failed${res ? `: HTTP ${res.status}` : ": network error"}`);
    cacheLife({ stale: 30, revalidate: 30, expire: 600 });
    return { kind: "error" };
  }
  cacheLife({ stale: 60, revalidate: 60, expire: 86_400 });
  return { kind: "ok", pack: toPack(res.body) };
}
