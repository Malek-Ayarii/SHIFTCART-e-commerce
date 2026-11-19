# Contrat d'intégration (shop ⇄ api ⇄ admin)

Précise `docs/API.md` au niveau JSON. **Les trois apps doivent respecter exactement ces formes.** En cas de doute, `API.md` donne le sens métier, ce fichier donne les noms de champs.

## Conventions

- Ports dev : shop `3000`, admin `4300`, api `8090`. Postgres : `localhost:5600` (5432, 8080 et 4200 sont déjà pris sur cette machine), base/utilisateur/mot de passe `shiftcart` (voir `docker-compose.yml`).
- Toutes les routes de l'API sont sous `/api`. JSON en camelCase. Dates en ISO-8601 UTC (`2026-11-14T10:32:00Z`).
- **Montants en JSON : nombres en TND** (`89`, `12638.5`). En base : millimes (`integer`/`bigint`). Conversion uniquement dans l'API.
- Statuts en JSON : `NEW | PENDING | CONFIRMED | SHIPPED | DELIVERED | RETURNED | CANCELLED` (majuscules). Les fronts les mappent vers `new | pending | …` pour les composants.
- Téléphone : la boutique envoie 8 chiffres ; l'API stocke `+216XXXXXXXX`. En sortie admin : `phone` = `"+216 98 765 432"` (affichage). **Jamais de téléphone dans les endpoints publics de suivi ni dans les logs** (masquer : `+216 98 ••• 432`).
- Erreurs :
  - `422` validation : `{ "errors": { "customerName"?: string, "phone"?: string, "governorate"?: string } }` — messages exacts de `API.md`.
  - `429` : `{ "error": "RATE_LIMITED", "message": "Trop de tentatives. Réessaie dans quelques minutes." }`
  - `409` transition interdite : `{ "error": "INVALID_TRANSITION", "message": "…" }`
  - `401/403/404/500` : `{ "error": "<CODE>", "message": "…" }`

## Public

### `POST /api/orders`
Requête :
```json
{ "customerName": "Mohamed Ben Ali", "phone": "98765432", "governorate": "Sousse",
  "productSku": "PACK-BARISTA", "quantity": 1,
  "source": { "utmSource": "tiktok", "utmCampaign": "nov", "utmContent": "reel-3" },
  "website": "" }
```
- `website` = honeypot : non vide → répondre `201` avec une fausse réf (`SC-0000`) sans rien enregistrer.
- Anti-doublon 30 min (même téléphone + même produit) → `200` avec la commande existante (même forme).
- Rate limit : 5 / 10 min par IP, 3 / 30 min par téléphone → `429`.

Réponse `201` :
```json
{ "ref": "SC-2951", "amountTnd": 89, "status": "NEW", "productName": "Le Pack Barista",
  "customerFirstName": "Mohamed", "phoneDisplay": "+216 98 765 432", "governorate": "Sousse",
  "trackingToken": "<jeton>",
  "whatsappConfirmUrl": "https://wa.me/216XXXXXXXX?text=Je%20confirme%20ma%20commande%20SC-2951",
  "trackingUrl": "http://localhost:3000/suivi/SC-2951?t=<jeton>" }
```
- `ref` : `SC-` + séquence Postgres démarrant à 2951.
- Jeton de suivi : HMAC-SHA256(`ref`, `TRACKING_TOKEN_SECRET`) en base64url ; l'API stocke son hash SHA-256 dans `tracking_token_hash` et compare en temps constant.
- La boutique (Server Action) garde `customerFirstName`, `phoneDisplay` et `trackingToken` dans un cookie httpOnly court (`sc_order`, 1 h) pour afficher `/merci/[ref]` — le téléphone ne passe jamais dans l'URL.

### `GET /api/orders/{ref}/tracking?t={token}`
`403` si jeton invalide, `404` si réf inconnue. Réponse :
```json
{ "ref": "SC-2951", "status": "SHIPPED", "productName": "Le Pack Barista", "amountTnd": 89,
  "governorate": "Sousse", "customerFirstName": "Mohamed", "carrier": "YALIDINE",
  "trackingNumber": "YAL-88213", "eta": "2026-11-16",
  "steps": [
    { "key": "RECEIVED",  "label": "Commande reçue",            "state": "done",     "at": "2026-11-14T10:32:00Z" },
    { "key": "CONFIRMED", "label": "Confirmée sur WhatsApp",    "state": "done",     "at": "…" },
    { "key": "SHIPPED",   "label": "Expédiée avec Yalidine",    "state": "current",  "at": "…", "detail": "N° de suivi YAL-88213" },
    { "key": "DELIVERED", "label": "Livrée & payée",            "state": "upcoming", "at": null }
  ] }
```
`state` ∈ `done | current | upcoming | cancelled`. `eta` = date d'expédition + 2 jours (ou création + 3 jours si non expédiée), `null` si livrée/annulée.

### Webhook WhatsApp
`GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=…&hub.challenge=…` → renvoie `hub.challenge` en texte si le jeton correspond, sinon `403`.
`POST /api/webhooks/whatsapp` : vérifie `X-Hub-Signature-256` (HMAC-SHA256 du corps brut avec `WHATSAPP_APP_SECRET`), toujours `200` rapidement si signature OK.

## Auth admin

- `POST /api/auth/login` `{ "email", "password" }` → `200 { "accessToken", "expiresIn": 900, "user": { "id", "email", "name", "role": "ADMIN" | "AGENT" } }` + cookie httpOnly `sc_refresh` (Path `/api/auth`, SameSite=Lax, 14 j). `401 { "error": "BAD_CREDENTIALS", "message": "Email ou mot de passe incorrect." }`.
- `POST /api/auth/refresh` (cookie) → même réponse que login (rotation du refresh). `401` sinon.
- `POST /api/auth/logout` → `204`, efface le cookie.
- `GET /api/auth/me` → `user`.
- Header : `Authorization: Bearer <accessToken>`. Access token JWT HS256 (`JWT_SECRET`), 15 min.
- Compte créé au démarrage si la table est vide : `ADMIN_EMAIL` / `ADMIN_PASSWORD` (défauts dev : `admin@shiftcart.tn` / `shiftcart-dev`).
- En dev l'admin passe par le proxy Angular (`/api` → `http://localhost:8090`), donc même origine.

## Admin — commandes (JWT)

`OrderSummary` :
```json
{ "id": 42, "ref": "SC-2948", "customerName": "Mohamed Ben Ali", "phone": "+216 98 765 432",
  "governorate": "Sousse", "productName": "Le Pack Barista", "quantity": 1, "amountTnd": 89,
  "status": "NEW", "carrier": null, "trackingNumber": null, "source": "tiktok / nov / reel-3",
  "createdAt": "2026-11-14T10:32:00Z" }
```
`OrderDetail` = `OrderSummary` + :
```json
{ "productSku": "PACK-BARISTA", "confirmedAt": null, "shippedAt": null, "deliveredAt": null, "returnedAt": null,
  "events":   [ { "id": 1, "fromStatus": null, "toStatus": "NEW", "actor": "customer", "note": null, "createdAt": "…" } ],
  "messages": [ { "id": 1, "direction": "OUT", "channel": "whatsapp", "tone": "amical", "body": "…", "status": "SENT", "createdAt": "…" } ],
  "allowedTransitions": ["CONFIRMED", "PENDING", "CANCELLED"] }
```

| Route | Détail |
| --- | --- |
| `GET /api/admin/orders?status=NEW&q=&month=2026-11&page=0&size=50` | `{ "content": OrderSummary[], "page", "size", "totalElements", "totalPages" }`, tri `createdAt` desc. `status` répétable (`status=NEW&status=PENDING`). `q` : réf (avec ou sans `#`/`SC-`), nom (ILIKE), chiffres du téléphone. |
| `GET /api/admin/orders/counts?month=` | `{ "NEW": 14, "PENDING": 8, "CONFIRMED": 24, "SHIPPED": 5, "DELIVERED": 80, "RETURNED": 9, "CANCELLED": 2 }` (toutes les clés, 0 si vide) |
| `GET /api/admin/orders/{id}` | `OrderDetail` |
| `PATCH /api/admin/orders/{id}/status` | `{ "status", "carrier"?, "trackingNumber"?, "note"? }` → `OrderDetail`. Transitions : `NEW→CONFIRMED|PENDING|CANCELLED`, `PENDING→CONFIRMED|CANCELLED`, `CONFIRMED→SHIPPED|CANCELLED`, `SHIPPED→DELIVERED|RETURNED`. `SHIPPED` sans `carrier` → `YALIDINE` par défaut. Sinon `409`. |
| `POST /api/admin/orders/{id}/messages/generate` | `{ "tone": "amical" | "direct" | "relance" }` → `{ "body": "…" }` |
| `POST /api/admin/orders/{id}/messages/send` | `{ "body" }` → `Message` (`status` : `SENT` · `FAILED` · `SIMULATED` quand WhatsApp n'est pas configuré) |
| `GET /api/admin/orders/{id}/delivery-slip.pdf` | `application/pdf` |

## Admin — stats (JWT)

`month` au format `YYYY-MM`, défaut = mois courant (fuseau `Africa/Tunis`).

`GET /api/admin/stats/kpis?month=` :
```json
{ "month": "2026-11", "orders": 142, "ordersDeltaPct": 18, "revenueTnd": 12638, "revenueDeltaPct": 11,
  "returnRatePct": 8, "returnRateDeltaPts": -2, "toConfirm": 22 }
```
(`revenueTnd` = CA commandé hors annulées ; `toConfirm` = NEW + PENDING ; deltas vs mois précédent, `null` si pas de base.)

`GET /api/admin/stats/finance?month=` :
```json
{ "month": "2026-11", "orderedTnd": 12638, "collectedTnd": 9612, "collectionRatePct": 76,
  "returnsTnd": 1068, "inProgressTnd": 1958, "carrierFeesTnd": 924, "shippedParcels": 132, "netTnd": 8688,
  "carrierFeeTnd": 7,
  "weekly": [ { "label": "S1", "orderedTnd": 2848, "collectedTnd": 2136 } ] }
```
`GET /api/admin/stats/governorates?month=` → `[ { "governorate": "Tunis", "orders": 38, "delivered": 30, "returned": 3, "collectedTnd": 2670, "sharePct": 27 } ]` trié par `orders` desc.

## Admin — stock (JWT)

`GET /api/admin/stock` :
```json
{ "items": [ { "id": 1, "name": "Cafetière italienne Moka", "unitCostTnd": 22, "quantity": 12, "threshold": 10, "perPack": 1, "status": "OK" } ],
  "completePacks": 3, "packThreshold": 5, "alert": true, "assemblablePacks": 9,
  "packPriceTnd": 89, "cogsTnd": 41.5, "carrierFeeTnd": 7, "marginTnd": 40.5, "marginPct": 45.5 }
```
`status` ∈ `OK | LOW` (`quantity < threshold`). `assemblablePacks` = min(quantité ÷ perPack). `completePacks` = colonne `product.assembled_stock`.
- `PATCH /api/admin/stock` `{ "items": [ { "id", "quantity"?, "unitCostTnd"?, "threshold"? } ] }` → même réponse.
- `POST /api/admin/stock/assemble` `{ "packs": 5 }` → décrémente les pièces, incrémente `completePacks` ; `409` si pas assez de pièces. Le passage `CONFIRMED→SHIPPED` décrémente `completePacks` (pas en dessous de 0).

## Données

- Migration de prod : schéma + produit `PACK-BARISTA` (« Le Pack Barista », 89 TND) + 4 pièces (Cafetière italienne Moka, Thermos intelligent LED, Café tunisien 250 g, Emballage) + nomenclature 1/1/1/1, **coûts à 0 = [À DÉFINIR]**.
- Profil Spring `dev` uniquement : migration de démo (`db/dev`) avec coûts d'exemple et ~60 commandes réparties sur octobre/novembre 2026 dans tous les statuts. Jamais en prod.
- Variables d'environnement supplémentaires de l'API : `SHOP_PUBLIC_URL` (défaut `http://localhost:3000`), `WHATSAPP_SHOP_NUMBER` (numéro pour `wa.me`, **[À DÉFINIR]**), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `LLM_MODEL` (défaut `claude-haiku-5-5`, API Anthropic Messages ; sans `LLM_API_KEY` → génération par gabarit déterministe).

---

# v2 — Catalogue multi-packs, photos, adresse exacte

**Prioritaire sur les sections ci-dessus en cas de conflit.** Spec fonctionnelle : `docs/SPEC-V2.md`.

## Configuration
- Numéro WhatsApp de la boutique : `21692184592` (+216 92 184 592). Défaut de `WHATSAPP_SHOP_NUMBER` (api : profil dev et `.env.example`), de `NEXT_PUBLIC_WHATSAPP_NUMBER` (shop : `.env.example` + `.env.local`) et du numéro boutique côté admin si utilisé.
- Les photos sont servies par l'API sur `GET /api/media/{id}` (public, `Cache-Control: public, max-age=31536000, immutable`, `ETag`). Les médias sont immuables (remplacer = nouvel id), donc le cache long est sûr.
  - Boutique : réécriture Next `/media/:id` → `${API_URL}/api/media/:id` ; `next/image` avec `src="/media/{id}"` (même origine, optimisée par Next). `media.url` vaut `/api/media/{id}` → la boutique remplace le préfixe `/api/media/` par `/media/`.
  - Admin : `/api/media/{id}` passe par le proxy (même origine).

## Objets partagés
`Media` : `{ "id": 12, "url": "/api/media/12", "contentType": "image/png", "width": 1024, "height": 572, "alt": "Le Pack Barista sur un bureau" }` (`width`/`height` peuvent être `null`).

`PackItem` (produit d'un pack) :
```json
{ "id": 3, "stockItemId": 3, "name": "Thermos intelligent", "description": "Affichage LED tactile…",
  "quantity": 1, "gift": false, "photo": null, "hotspot": { "x": 84, "y": 66 } }
```
(`photo` : `Media | null` ; `hotspot` : `{x,y} | null`, en % de 0 à 100.)

`Savings` (calculateur, optionnel) :
```json
{ "title": "Calcule tes économies", "question": "Combien tu dépenses en café par jour ?", "min": 4, "max": 10, "step": 0.5,
  "defaultValue": 6, "homeCostPerDay": 0.5, "daysPerMonth": 30 }
```

## Public — catalogue
`ProductPublic` :
```json
{ "id": 1, "slug": "pack-barista", "sku": "PACK-BARISTA", "name": "Le Pack Barista", "badge": "Best-seller",
  "tagline": "Ton café de pro partout avec toi. Rentabilisé en 20 jours.",
  "audience": "Étudiants, jeunes actifs, employés de bureau (amateurs de café).",
  "description": "…", "priceTnd": 89, "featured": true, "sortOrder": 0,
  "cover": null, "gallery": [], "items": [], "savings": null, "availability": "IN_STOCK" }
```
(`cover` : `Media | null` ; `gallery` : `Media[]` ; `items` : `PackItem[]` ; `savings` : `Savings | null` ; `availability` : `IN_STOCK` si packs complets > 0 ou assemblables > 0, sinon `MADE_TO_ORDER`.)

| Route | Réponse |
| --- | --- |
| `GET /api/products` | `ProductPublic[]` des packs **actifs**, triés par `sortOrder` puis `id` |
| `GET /api/products/{slug}` | `ProductPublic` ; `404` si inconnu ou inactif |
| `GET /api/media/{id}` | octets de l'image |

## Commande — adresse exacte
`POST /api/orders` ajoute **`address`** (obligatoire) :
```json
{ "customerName": "…", "phone": "98765432", "governorate": "Sousse",
  "address": "12 rue de Marseille, cité El Khadra, Tunis (près de la pharmacie)",
  "productSku": "PACK-SETUP", "quantity": 1, "source": {}, "website": "" }
```
- Validation : 10–200 caractères après trim ; erreurs `422` sous la clé `address` : vide « Ton adresse permet au livreur de te trouver. », trop courte « Précise ta rue, ton quartier et ta ville. », trop longue « Ton adresse est trop longue (200 caractères max). ».
- `productSku` d'un pack inactif ou inconnu → `422 { "errors": { "productSku": "Ce pack n'est plus disponible." } }`.
- Montant = `priceTnd` du pack au moment de la commande (figé dans la commande).
- Réponse `201`/`200` : ajoute `productSlug`, `productCoverUrl` (`/api/media/{id}` ou `null`). Jamais l'adresse.
- Suivi public `GET /api/orders/{ref}/tracking` : ajoute `productSlug`, `productCoverUrl`. **Jamais l'adresse.**
- Anti-doublon : même téléphone + même pack en 30 min (inchangé).
- Adresse jamais loggée (comme le téléphone).

## Admin — commandes
`OrderSummary` ajoute `productId`, `productSlug`, `productCoverUrl`, `address`. Filtre `GET /api/admin/orders?productId=`. `q` cherche aussi dans l'adresse. `counts` accepte `productId`. Le bon de livraison PDF affiche l'adresse exacte.

## Admin — packs (JWT)
`ProductAdmin` = `ProductPublic` + `{ "active": true, "createdAt": "…", "updatedAt": "…", "completePacks": 3, "assemblablePacks": 9, "ordersThisMonth": 42 }`.

| Route | Détail |
| --- | --- |
| `GET /api/admin/products` | `ProductAdmin[]` (actifs et brouillons), triés par `sortOrder` |
| `GET /api/admin/products/{id}` | `ProductAdmin` |
| `POST /api/admin/products` | `ProductInput` → `201 ProductAdmin` |
| `PUT /api/admin/products/{id}` | `ProductInput` → `ProductAdmin` |
| `DELETE /api/admin/products/{id}` | `204` ; `409 { "error": "PRODUCT_HAS_ORDERS", "message": "Ce pack a déjà des commandes : désactive-le plutôt." }` |
| `PUT /api/admin/products/order` | `{ "ids": [3, 1, 2, 4] }` → `204` (réécrit `sortOrder`) |
| `PUT /api/admin/products/{id}/cover` | `{ "mediaId": 12 }` (ou `null`) → `ProductAdmin` |
| `PUT /api/admin/products/{id}/gallery` | `{ "mediaIds": [12, 15, 16] }` (ordre d'affichage) → `ProductAdmin` |
| `PUT /api/admin/products/{id}/items` | `{ "items": [ { "stockItemId": 3, "quantity": 1, "gift": false, "hotspot": { "x": 84, "y": 66 } } ] }` → `ProductAdmin` |

`ProductInput` : `{ "name", "slug"?, "sku"?, "badge"?, "tagline", "audience"?, "description"?, "priceTnd", "active", "featured"?, "savings" }`.
- `slug` généré depuis le nom si absent (minuscules, sans accents, tirets), unique → sinon `422 { "errors": { "slug": "Ce lien est déjà utilisé par un autre pack." } }`. `sku` généré `PACK-<SLUG>` si absent, unique.
- `name` 3–80 car. ; `tagline` 5–160 ; `priceTnd` ≥ 0, 3 décimales max ; `active=true` exige `priceTnd > 0` → `422 { "errors": { "priceTnd": "Fixe un prix avant d'activer ce pack." } }`. Un seul `featured` à la fois.
- `hotspot.x` / `hotspot.y` entre 0 et 100.

## Admin — médias (JWT)
- `POST /api/admin/media` (multipart : `file`, `alt` optionnel) → `201 Media`. Types `image/jpeg`, `image/png`, `image/webp`, vérifiés par les octets magiques. ≤ 8 Mo. Erreurs `422` sous `file` : « Photo trop lourde (8 Mo max). » / « Format accepté : JPEG, PNG ou WebP. ». Stockage : table `media` (bytea).
- `PATCH /api/admin/media/{id}` `{ "alt" }` → `Media`.
- Ne jamais supprimer un média encore référencé.

## Admin — stock v2 (remplace la section « stock » ci-dessus)
`GET /api/admin/stock` :
```json
{ "items": [ { "id": 1, "name": "Cafetière italienne (Moka)", "description": "…", "photo": null,
               "unitCostTnd": 22, "quantity": 12, "threshold": 10, "status": "OK",
               "usedIn": [ { "productId": 1, "name": "Le Pack Barista", "perPack": 1 } ] } ],
  "packs": [ { "productId": 1, "name": "Le Pack Barista", "slug": "pack-barista", "active": true, "cover": null,
               "completePacks": 3, "assemblablePacks": 9, "packThreshold": 5, "alert": true,
               "priceTnd": 89, "cogsTnd": 41.5, "carrierFeeTnd": 7, "marginTnd": 40.5, "marginPct": 45.5 } ],
  "alert": true, "carrierFeeTnd": 7 }
```
(`alert` global = au moins un pack **actif** sous le seuil.)
- `PATCH /api/admin/stock` `{ "items": [ { "id", "name"?, "description"?, "photoMediaId"? (null = retirer), "quantity"?, "unitCostTnd"?, "threshold"? } ] }` → même réponse.
- `POST /api/admin/stock/items` `{ "name", "description"?, "photoMediaId"?, "unitCostTnd", "quantity", "threshold" }` → `201` + réponse stock complète.
- `DELETE /api/admin/stock/items/{id}` → `204` ; `409 { "error": "ITEM_IN_USE", "message": "Cette pièce est utilisée dans un pack." }`.
- `POST /api/admin/stock/assemble` `{ "productId": 1, "packs": 5 }` → réponse stock ; `409 INSUFFICIENT_STOCK`.

## Admin — stats v2
- `kpis`, `finance`, `governorates`, `counts` acceptent un `productId` optionnel.
- `GET /api/admin/stats/products?month=` → `[ { "productId", "name", "orders", "delivered", "returned", "collectedTnd", "sharePct", "orderedTnd" } ]` (`orderedTnd` = CA commandé hors annulées).
- `GET /api/admin/stats/daily?month=&productId=` → une ligne par jour du mois (heure de Tunis, jours vides à 0) : `[ { "date": "2026-11-01", "orders": 4, "orderedTnd": 356 } ]` (`orders` = commandes créées, annulées comprises ; `orderedTnd` hors annulées).
- `GET /api/admin/stats/calendar?year=&productId=` → agenda : `{ "year": 2026, "days": [ { "date", "orders", "orderedTnd", "delivered", "returned", "cancelled" } ] }`, un jour par jour de l'année (heure de Tunis, vides à 0). `year` hors 2000–2100 → `400`.
- `GET /api/admin/orders?day=AAAA-MM-JJ` : filtre une journée (heure de Tunis), cumulable avec les autres filtres ; format invalide → `400`.

## Admin — agents IA (JWT)
Un assistant (`assistant`) oriente la question et consulte des spécialistes (`social`, `content`, `design`, `developer`, `security`, `sales`, `finance`) ; un spécialiste peut interroger un collègue (profondeur max 2, 8 consultations par demande). Les agents lisent uniquement des agrégats (KPI, finances, jours, gouvernorats, packs, stock, catalogue) — jamais de données personnelles client. Modèle : `AGENTS_MODEL` (défaut `claude-opus-5-5`), SDK Java officiel Anthropic.
- `GET /api/admin/agents` → `{ "configured": bool, "model", "agents": [ { "key", "label", "domain", "summary", "reads": [..], "coordinator" } ] }`.
- `GET /api/admin/agents/threads` → fils du membre connecté `[ { "id", "title", "lastAgent", "createdAt", "updatedAt", "messages" } ]`.
- `GET /api/admin/agents/threads/{id}` → `{ "id", "title", "createdAt", "updatedAt", "messages": [ { "id", "role": "user|assistant", "agent", "content", "trace": [ { "type": "consult|data", "from", "to", "depth", "label", "question", "answer", "status" } ], "status": "ok|refused|truncated|error", "createdAt" } ] }` ; fil d'un autre membre → `404`.
- `POST /api/admin/agents/threads` `{ "content", "agent"? }` (nouveau fil) et `POST /api/admin/agents/threads/{id}/messages` (suite) → `{ "thread", "question", "answer" }`. Réponse synchrone (jusqu'à ~1 min). Erreurs : `400` (vide, > 4000 caractères, agent inconnu), `409 AGENT_BUSY` (une demande à la fois), `429 AGENTS_RATE_LIMIT`, `503 AGENTS_NOT_CONFIGURED | AGENTS_AUTH | AGENTS_UPSTREAM | AGENTS_NETWORK` (rien n'est enregistré).
- `DELETE /api/admin/agents/threads/{id}` → `204`.

## Données d'amorçage v2
- Migration **de prod** : les 4 packs de `docs/SPEC-V2.md` (textes exacts, slugs, SKU, prix ; Meal Prep en brouillon prix 0, puis passé à 99 TND et activé par la migration `V4__meal_prep_mvp_price` — prix MVP provisoire), leurs pièces (coûts 0 = [À DÉFINIR]), compositions, hotspots, calculateurs. Le Pack Barista existant (`PACK-BARISTA`) est **mis à jour**, pas recréé.
- Les 3 photos (`classpath:seed/packs/<slug>.png`) sont importées dans `media` au démarrage par un amorceur idempotent (seulement si le pack n'a pas de photo principale), avec un `alt` descriptif en français.
- Profil `dev` : commandes de démo réparties sur les packs actifs, adresses d'exemple clairement fictives.
