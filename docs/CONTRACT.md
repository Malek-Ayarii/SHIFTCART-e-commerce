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
