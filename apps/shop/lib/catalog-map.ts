/**
 * Catalogue v2 (docs/CONTRACT.md › v2): raw API shapes + pure mapping to what the shop renders.
 * Pure module (no fetch, no Next import) so it is unit-testable and safe in Client Components.
 */

import { focusFromHotspots, type FocusBox } from "./focus";

export interface ApiMedia {
  id: number;
  url: string;
  contentType?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

export interface Hotspot {
  x: number;
  y: number;
}

export interface ApiPackItem {
  id: number;
  stockItemId?: number;
  name: string;
  description?: string | null;
  quantity?: number;
  gift?: boolean;
  photo?: ApiMedia | null;
  hotspot?: Hotspot | null;
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

export type Availability = "IN_STOCK" | "MADE_TO_ORDER";

export interface ApiProductPublic {
  id: number;
  slug: string;
  sku: string;
  name: string;
  badge?: string | null;
  tagline: string;
  audience?: string | null;
  description?: string | null;
  priceTnd: number;
  featured?: boolean;
  sortOrder?: number;
  cover?: ApiMedia | null;
  gallery?: ApiMedia[] | null;
  items?: ApiPackItem[] | null;
  savings?: Savings | null;
  availability?: Availability | null;
}

/** An image the shop can hand to next/image (same-origin `/media/{id}`). */
export interface Img {
  id: number;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Cover only: where the products are (from the hotspots), for art-directed crops (lib/focus.ts). */
  focus?: FocusBox | null;
}

export interface PackItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  gift: boolean;
  photo: Img | null;
  hotspot: Hotspot | null;
}

export interface Pack {
  id: number;
  slug: string;
  sku: string;
  name: string;
  /** « Le Pack Barista » → « Pack Barista » (short labels). */
  shortName: string;
  badge: string | null;
  tagline: string;
  audience: string | null;
  description: string | null;
  priceTnd: number;
  featured: boolean;
  cover: Img | null;
  /** Cover first, then the gallery (no duplicates). */
  images: Img[];
  items: PackItem[];
  savings: Savings | null;
  availability: Availability;
}

/** Light summary passed to client islands (menu, related packs). */
export interface PackSummary {
  slug: string;
  name: string;
  shortName: string;
  priceTnd: number;
  cover: Img | null;
}

/** Fallback intrinsic size of the seed photos (1024 × 572) when the API sends null. */
const DEFAULT_W = 1024;
const DEFAULT_H = 572;

/**
 * `/api/media/12` → `/media/12` (rewritten by next.config to the API). Absolute URLs keep their
 * path only, so an image never leaves the shop origin. Anything else → null.
 */
export function mediaSrc(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  let path = url.trim();
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }
  const m = path.match(/^\/(?:api\/)?media\/(\d+)\/?$/);
  return m ? `/media/${m[1]}` : null;
}

export function toImg(media: ApiMedia | null | undefined, fallbackAlt: string): Img | null {
  if (!media) return null;
  const src = mediaSrc(media.url) ?? (Number.isInteger(media.id) ? `/media/${media.id}` : null);
  if (!src) return null;
  const width = media.width && media.width > 0 ? media.width : DEFAULT_W;
  const height = media.height && media.height > 0 ? media.height : DEFAULT_H;
  return { id: media.id, src, width, height, alt: (media.alt ?? "").trim() || fallbackAlt };
}

function clampPct(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.min(100, Math.max(0, v));
}

function toHotspot(h: Hotspot | null | undefined): Hotspot | null {
  if (!h) return null;
  const x = clampPct(h.x);
  const y = clampPct(h.y);
  return x === null || y === null ? null : { x, y };
}

function validSavings(s: Savings | null | undefined): Savings | null {
  if (!s) return null;
  const nums = [s.min, s.max, s.step, s.defaultValue, s.homeCostPerDay, s.daysPerMonth];
  if (nums.some((n) => typeof n !== "number" || !Number.isFinite(n))) return null;
  if (s.max <= s.min || s.step <= 0) return null;
  return { ...s, defaultValue: Math.min(s.max, Math.max(s.min, s.defaultValue)) };
}

export function shortPackName(name: string): string {
  return name.replace(/^(le|la|les)\s+/i, "").trim() || name;
}

export function toPack(p: ApiProductPublic): Pack {
  const rawCover = toImg(p.cover, p.name);
  const focus = focusFromHotspots((p.items ?? []).map((it) => toHotspot(it.hotspot)));
  const cover = rawCover && focus ? { ...rawCover, focus } : rawCover;
  const images: Img[] = [];
  const seen = new Set<string>();
  for (const img of [cover, ...(p.gallery ?? []).map((g) => toImg(g, p.name))]) {
    if (img && !seen.has(img.src)) {
      seen.add(img.src);
      images.push(img);
    }
  }
  return {
    id: p.id,
    slug: p.slug,
    sku: p.sku,
    name: p.name,
    shortName: shortPackName(p.name),
    badge: p.badge?.trim() || null,
    tagline: p.tagline,
    audience: p.audience?.trim() || null,
    description: p.description?.trim() || null,
    priceTnd: Number(p.priceTnd) || 0,
    featured: !!p.featured,
    cover,
    images,
    items: (p.items ?? []).map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description?.trim() ?? "",
      quantity: it.quantity && it.quantity > 0 ? it.quantity : 1,
      gift: !!it.gift,
      photo: toImg(it.photo, it.name),
      hotspot: toHotspot(it.hotspot),
    })),
    savings: validSavings(p.savings),
    availability: p.availability === "MADE_TO_ORDER" ? "MADE_TO_ORDER" : "IN_STOCK",
  };
}

export function toSummary(p: Pack): PackSummary {
  return { slug: p.slug, name: p.name, shortName: p.shortName, priceTnd: p.priceTnd, cover: p.cover };
}

/** Featured pack first (or the first by sortOrder when none is flagged). */
export function featuredPack(packs: Pack[]): Pack | null {
  return packs.find((p) => p.featured) ?? packs[0] ?? null;
}

export const AVAILABILITY_COPY: Record<Availability, string> = {
  IN_STOCK: "En stock — expédié sous 24 h",
  MADE_TO_ORDER: "Sur commande — 48–72 h",
};

export function packHref(slug: string): string {
  return `/packs/${encodeURIComponent(slug)}`;
}
