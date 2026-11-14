// Minimal stand-in for apps/api used by the Playwright e2e and the visual checks
// (docs/CONTRACT.md shapes, v2 section). The shop calls the API server-side (catalogue, Server
// Action, tracking) and through the /media/:id rewrite, so browser route interception cannot
// mock it: this tiny server is started by playwright.config.ts instead.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.MOCK_API_PORT || 8099);
const HERE = dirname(fileURLToPath(import.meta.url));
const PHOTOS = resolve(HERE, "../../../../design/photos");
const FIXTURES = resolve(HERE, "fixtures");

let last = null;
let seq = 2951;

/** Media store: id → file. 1–3 = seed photos (design/photos), 4–5 = gallery detail shots. */
const MEDIA = {
  1: { file: resolve(PHOTOS, "pack-barista.png"), type: "image/png", width: 1024, height: 572, alt: "Le Pack Barista sur un bureau : Moka, thermos LED et café de Tunisie" },
  2: { file: resolve(PHOTOS, "pack-espace-autonome.png"), type: "image/png", width: 1024, height: 572, alt: "Le Pack Espace Autonome sur un bureau en open space" },
  3: { file: resolve(PHOTOS, "pack-meal-prep.png"), type: "image/png", width: 1024, height: 572, alt: "Le Pack Meal Prep : lunchbox chauffante, gourde et couverts" },
  4: { file: resolve(FIXTURES, "barista-detail.webp"), type: "image/webp", width: 1024, height: 762, alt: "Le café de Tunisie, la Moka noire mat et le thermos qui affiche 55 °C" },
  5: { file: resolve(FIXTURES, "espace-detail.webp"), type: "image/webp", width: 1024, height: 761, alt: "La bouilloire pliable, la multiprise cube et l'organisateur de bureau" },
};
const media = (id) => ({ id, url: `/api/media/${id}`, contentType: MEDIA[id].type, width: MEDIA[id].width, height: MEDIA[id].height, alt: MEDIA[id].alt });
const item = (id, name, description, hotspot, gift = false) => ({ id, stockItemId: id, name, description, quantity: 1, gift, photo: null, hotspot });

/** Texts of docs/SPEC-V2.md (Meal Prep is a draft: not public). */
const PRODUCTS = [
  {
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
    cover: media(1),
    gallery: [media(4)],
    items: [
      item(1, "Cafetière italienne (Moka)", "Design premium en acier inoxydable noir mat.", { x: 72, y: 76 }),
      item(2, "Thermos intelligent", "Affichage LED tactile de la température sur le bouchon pour garder le café brûlant.", { x: 84, y: 66 }),
      item(3, "Café local de spécialité 250 g", "Torréfaction artisanale : le petit plus.", { x: 63, y: 68 }, true),
    ],
    savings: { title: "Calcule tes économies", question: "Combien tu dépenses en café par jour ?", min: 4, max: 10, step: 0.5, defaultValue: 6, homeCostPerDay: 0.5, daysPerMonth: 30 },
    availability: "IN_STOCK",
  },
  {
    id: 2,
    slug: "pack-setup-productivite",
    sku: "PACK-SETUP",
    name: "Le Pack Setup & Productivité",
    badge: null,
    tagline: "Code et révise confortablement, sans te ruiner les yeux ni le dos.",
    audience: "Développeurs, designers, ingénieurs et employés passant +8 h par jour sur un ordinateur.",
    description: null,
    priceTnd: 79,
    featured: false,
    sortOrder: 1,
    cover: null,
    gallery: [],
    items: [
      item(4, "Support d'ordinateur pliable", "En aluminium, ergonomique pour surélever l'écran et soulager les cervicales.", null),
      item(5, "Lampe LED d'écran", "À clipser sur le haut de l'écran pour éclairer le clavier sans reflet (idéal pour le soir).", null),
      item(6, "Lunettes anti-lumière bleue", "Monture minimaliste (métal noir ou écailles) pour réduire la fatigue oculaire et les maux de tête.", null),
    ],
    savings: null,
    availability: "MADE_TO_ORDER",
  },
  {
    id: 3,
    slug: "pack-espace-autonome",
    sku: "PACK-ESPACE",
    name: "Le Pack Espace Autonome",
    badge: null,
    tagline: "Un espace 100% autonome, organisé et optimisé, même dans 9m².",
    audience: "Étudiants en foyer/colocation ou employés en open space sans accès facile à une cuisine.",
    description: null,
    priceTnd: 79,
    featured: false,
    sortOrder: 2,
    cover: media(2),
    gallery: [media(5)],
    items: [
      item(7, "Mini-bouilloire de voyage", "Pliable en silicone, gain de place absolu (se range dans un tiroir).", { x: 33, y: 63 }),
      item(8, "Multiprise « Cube » design", "Ultra-compacte avec prises secteur et ports USB/Type-C pour charger PC, téléphone et écouteurs.", { x: 42, y: 74 }),
      item(9, "Organisateur de bureau", "Pot multifonction moderne pour les câbles et stylos.", { x: 57, y: 52 }),
    ],
    savings: null,
    availability: "IN_STOCK",
  },
];

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "GET" && url.pathname === "/__last") return send(res, 200, last);

  if (req.method === "GET" && url.pathname === "/api/products") return send(res, 200, PRODUCTS);
  const pm = url.pathname.match(/^\/api\/products\/([a-z0-9-]+)$/);
  if (req.method === "GET" && pm) {
    const p = PRODUCTS.find((x) => x.slug === pm[1]);
    return p ? send(res, 200, p) : send(res, 404, { error: "NOT_FOUND", message: "Pack introuvable" });
  }
  const mm = url.pathname.match(/^\/api\/media\/(\d+)$/);
  if (req.method === "GET" && mm) {
    const m = MEDIA[mm[1]];
    if (!m) return send(res, 404, { error: "NOT_FOUND", message: "Média introuvable" });
    res.writeHead(200, { "Content-Type": m.type, "Cache-Control": "public, max-age=31536000, immutable", ETag: `"m${mm[1]}"` });
    return res.end(readFileSync(m.file));
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}");
      last = body;
      if (body.customerName === "Rate Limit") {
        return send(res, 429, { error: "RATE_LIMITED", message: "Trop de tentatives. Réessaie dans quelques minutes." });
      }
      if (body.phone === "31111111") {
        return send(res, 422, { errors: { phone: "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9." } });
      }
      const address = String(body.address ?? "").trim();
      if (!address) return send(res, 422, { errors: { address: "Ton adresse permet au livreur de te trouver." } });
      if (address.length < 10) return send(res, 422, { errors: { address: "Précise ta rue, ton quartier et ta ville." } });
      const product = PRODUCTS.find((p) => p.sku === body.productSku);
      if (!product) return send(res, 422, { errors: { productSku: "Ce pack n'est plus disponible." } });
      const ref = `SC-${seq++}`;
      const d = body.phone;
      return send(res, 201, {
        ref,
        amountTnd: product.priceTnd,
        status: "NEW",
        productName: product.name,
        productSlug: product.slug,
        productCoverUrl: product.cover ? product.cover.url : null,
        customerFirstName: String(body.customerName).trim().split(/\s+/)[0],
        phoneDisplay: `+216 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`,
        governorate: body.governorate,
        trackingToken: "good-token",
        whatsappConfirmUrl: `https://wa.me/21600000000?text=${encodeURIComponent(`Je confirme ma commande ${ref}`)}`,
        trackingUrl: `http://localhost:3100/suivi/${ref}?t=good-token`,
      });
    });
    return;
  }

  const m = url.pathname.match(/^\/api\/orders\/(SC-\d+)\/tracking$/);
  if (req.method === "GET" && m) {
    if (m[1] === "SC-404") return send(res, 404, { error: "NOT_FOUND", message: "Commande introuvable" });
    if (url.searchParams.get("t") !== "good-token") return send(res, 403, { error: "FORBIDDEN", message: "Jeton invalide" });
    return send(res, 200, {
      ref: m[1],
      status: "SHIPPED",
      productName: "Le Pack Barista",
      productSlug: "pack-barista",
      productCoverUrl: "/api/media/1",
      amountTnd: 89,
      governorate: "Sousse",
      customerFirstName: "Mohamed",
      carrier: "YALIDINE",
      trackingNumber: "YAL-88213",
      eta: "2026-11-16",
      steps: [
        { key: "RECEIVED", label: "Commande reçue", state: "done", at: "2026-11-14T10:32:00Z" },
        { key: "CONFIRMED", label: "Confirmée sur WhatsApp", state: "done", at: "2026-11-14T10:41:00Z" },
        { key: "SHIPPED", label: "Expédiée avec Yalidine", state: "current", at: "2026-11-15T08:10:00Z", detail: "N° de suivi YAL-88213" },
        { key: "DELIVERED", label: "Livrée & payée", state: "upcoming", at: null },
      ],
    });
  }
  send(res, 404, { error: "NOT_FOUND", message: "?" });
});

server.listen(PORT, () => console.log(`mock api on :${PORT}`));
