import { describe, expect, it } from "vitest";
import { pickFieldErrors } from "@/lib/api";
import { AVAILABILITY_COPY, featuredPack, mediaSrc, shortPackName, toPack, type ApiProductPublic } from "@/lib/catalog-map";
import { coverPosition, coverVars, focusFromHotspots } from "@/lib/focus";
import { hotspotZoomStyle } from "@/lib/hotspot";

const media = (id: number, extra: Partial<{ width: number | null; height: number | null; alt: string | null }> = {}) => ({
  id,
  url: `/api/media/${id}`,
  contentType: "image/png",
  width: 1024,
  height: 572,
  alt: "Le Pack Barista sur un bureau",
  ...extra,
});

const barista: ApiProductPublic = {
  id: 1,
  slug: "pack-barista",
  sku: "PACK-BARISTA",
  name: "Le Pack Barista",
  badge: "Best-seller",
  tagline: "Ton café de pro partout avec toi. Rentabilisé en 20 jours.",
  audience: "Étudiants, jeunes actifs, employés de bureau (amateurs de café).",
  description: null,
  priceTnd: 89,
  featured: true,
  sortOrder: 0,
  cover: media(12),
  gallery: [media(12), media(15, { width: null, height: null, alt: null })],
  items: [
    { id: 3, stockItemId: 3, name: "Thermos intelligent", description: "Affichage LED", quantity: 1, gift: false, photo: null, hotspot: { x: 84, y: 66 } },
    { id: 4, stockItemId: 4, name: "Café local", quantity: 1, gift: true, photo: media(20), hotspot: { x: 140, y: -3 } },
  ],
  savings: {
    title: "Calcule tes économies",
    question: "Combien tu dépenses en café par jour ?",
    min: 4,
    max: 10,
    step: 0.5,
    defaultValue: 6,
    homeCostPerDay: 0.5,
    daysPerMonth: 30,
  },
  availability: "IN_STOCK",
};

describe("mediaSrc: API media url → same-origin /media/{id}", () => {
  it.each([
    ["/api/media/12", "/media/12"],
    ["/media/7", "/media/7"],
    ["http://localhost:8090/api/media/3", "/media/3"],
    ["https://evil.example/api/media/3/", "/media/3"],
    ["/api/media/abc", null],
    ["/uploads/x.png", null],
    ["", null],
    [null, null],
  ])("%j → %j", (input, expected) => {
    expect(mediaSrc(input as string | null)).toBe(expected);
  });
});

describe("toPack", () => {
  const p = toPack(barista);
  it("maps the cover and dedupes the gallery (cover first)", () => {
    expect(p.cover).toMatchObject({ id: 12, src: "/media/12", width: 1024, height: 572, alt: "Le Pack Barista sur un bureau" });
    // the products area (padded hotspots, clamped) travels with the cover for art-directed crops
    expect(p.cover?.focus).toEqual({ x0: 75, x1: 100, y0: 0, y1: 78 });
    expect(p.images.map((i) => i.src)).toEqual(["/media/12", "/media/15"]);
    // null sizes / alt fall back to the seed size and the pack name
    expect(p.images[1]).toMatchObject({ width: 1024, height: 572, alt: "Le Pack Barista" });
  });
  it("maps items: photo url, clamped hotspot, gift", () => {
    expect(p.items[0]).toMatchObject({ name: "Thermos intelligent", photo: null, hotspot: { x: 84, y: 66 }, gift: false, quantity: 1 });
    expect(p.items[1].photo?.src).toBe("/media/20");
    expect(p.items[1].hotspot).toEqual({ x: 100, y: 0 });
    expect(p.items[1].gift).toBe(true);
  });
  it("short name, savings, availability", () => {
    expect(p.shortName).toBe("Pack Barista");
    expect(shortPackName("Pack Solo")).toBe("Pack Solo");
    expect(p.savings?.max).toBe(10);
    expect(toPack({ ...barista, savings: { ...barista.savings!, max: 2 } }).savings).toBeNull();
    expect(toPack({ ...barista, availability: "MADE_TO_ORDER" }).availability).toBe("MADE_TO_ORDER");
    expect(AVAILABILITY_COPY.IN_STOCK).toBe("En stock — expédié sous 24 h");
    expect(AVAILABILITY_COPY.MADE_TO_ORDER).toBe("Sur commande — 48–72 h");
  });
  it("pack without photo: no cover, no images (branded fallback)", () => {
    const setup = toPack({ ...barista, slug: "pack-setup-productivite", cover: null, gallery: [], featured: false });
    expect(setup.cover).toBeNull();
    expect(setup.images).toEqual([]);
  });
  it("featuredPack prefers the flagged pack", () => {
    const a = toPack({ ...barista, slug: "a", featured: false });
    const b = toPack({ ...barista, slug: "b", featured: true });
    expect(featuredPack([a, b])?.slug).toBe("b");
    expect(featuredPack([a])?.slug).toBe("a");
    expect(featuredPack([])).toBeNull();
  });
});

describe("pickFieldErrors (422 from the API)", () => {
  it("keeps the 4 fields + productSku", () => {
    expect(
      pickFieldErrors({ errors: { address: "Précise ta rue, ton quartier et ta ville.", productSku: "Ce pack n'est plus disponible.", other: "x" } }),
    ).toEqual({ address: "Précise ta rue, ton quartier et ta ville.", productSku: "Ce pack n'est plus disponible." });
  });
});

describe("focus (art-directed crops)", () => {
  it("pads the hotspots into a product box, null without hotspots", () => {
    expect(focusFromHotspots([{ x: 63, y: 68 }, { x: 72, y: 76 }, null, { x: 84, y: 66 }])).toEqual({ x0: 54, x1: 93, y0: 54, y1: 88 });
    expect(focusFromHotspots([null, undefined])).toBeNull();
  });
  it("centres the product box in the frame, clamped to the photo edges", () => {
    const box = focusFromHotspots([{ x: 63, y: 68 }, { x: 72, y: 76 }, { x: 84, y: 66 }]);
    // 4:3 frame on a 1024×572 photo: the right-hand products need the right edge
    expect(coverPosition(box, 1024 / 572, 4 / 3)).toBe("100% 50%");
    // centred box → centred crop; frame as wide as the photo → nothing to move on x
    expect(coverPosition({ x0: 40, x1: 60, y0: 40, y1: 60 }, 1024 / 572, 1)).toBe("50% 50%");
    expect(coverPosition(box, 1024 / 572, 1024 / 572)).toBe("50% 50%");
    expect(coverPosition(null, 1.79, 1)).toBe("50% 50%");
  });
  it("exposes mobile and lg positions as CSS variables", () => {
    const vars = coverVars({ x0: 30, x1: 60, y0: 40, y1: 80 }, { width: 1024, height: 572 }, 4 / 3, 0.82) as Record<string, string>;
    expect(vars["--focus"]).toMatch(/^\d+% \d+%$/);
    expect(vars["--focus-lg"]).toMatch(/^\d+% \d+%$/);
  });
});

describe("hotspotZoomStyle", () => {
  it("anchors on the hotspot and never uncovers the frame", () => {
    const s = hotspotZoomStyle({ x: 84, y: 66 }, 2.4);
    expect(s.objectPosition).toBe("84% 66%");
    expect(s.transformOrigin).toBe("84% 66%");
    // x: wanted -34, clamped to -22.4 so the right edge stays covered
    expect(s.transform).toBe("translate(-22.4%, -16%) scale(2.4)");
    expect(hotspotZoomStyle({ x: 50, y: 50 }, 2).transform).toBe("translate(0%, 0%) scale(2)");
  });
});
