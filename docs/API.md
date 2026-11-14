# API, données et flux WhatsApp

## Cycle de vie d'une commande (COD)

```
NEW ──(client répond OUI / agent confirme)──▶ CONFIRMED ──(remise au transporteur)──▶ SHIPPED ──▶ DELIVERED (encaissée)
 │                                                                                        │
 └─(pas de réponse après relance)──▶ PENDING ──▶ CONFIRMED | CANCELLED                    └──▶ RETURNED (refus / injoignable)
```

| Statut | Libellé UI | Couleur (token) | Icône | Colonne Kanban | Action de la carte |
| --- | --- | --- | --- | --- | --- |
| `NEW` | Nouvelle | `orange` | Zap | Nouvelles | **WhatsApp** (générer + envoyer le message) |
| `PENDING` | En attente | `warning` | Clock | En attente | **Relancer** |
| `CONFIRMED` | Confirmée | `success` | Check | Confirmées | **Imprimer** (bon de livraison) |
| `SHIPPED` | Expédiée | `info` | Truck | Expédiées | transporteur + n° de suivi |
| `DELIVERED` | Livrée | `success` | Banknote | (hors Kanban, dans Finances) | — |
| `RETURNED` | Retournée | `danger` | RotateCcw | (5e colonne optionnelle) | — |
| `CANCELLED` | Annulée | `ink-muted` | X | — | — |

Chaque changement de statut crée un `OrderEvent` (qui, quand, depuis quel statut).

## Modèle de données (PostgreSQL)

```
product        id, sku ('PACK-BARISTA'), name, price_tnd (89), active
order          id, ref ('SC-2951', unique), product_id, quantity, amount_tnd,
               customer_name, phone_e164 ('+21698765432'), governorate (enum des 24),
               status, carrier ('YALIDINE' | 'BOSTA' | …), tracking_number,
               source (utm_source/utm_campaign/créatif), tracking_token_hash,
               created_at, confirmed_at, shipped_at, delivered_at, returned_at
order_event    id, order_id, from_status, to_status, actor ('customer' | 'agent:<id>' | 'system'), note, created_at
message        id, order_id, direction ('out' | 'in'), channel ('whatsapp'), tone, body, provider_message_id, status, created_at
stock_item     id, name, unit_cost_tnd, quantity, threshold   -- pièces : Moka, Thermos LED, café 250 g, emballage
pack_bom       product_id, stock_item_id, quantity            -- nomenclature du pack
admin_user     id, email, password_hash, role ('admin' | 'agent')
```

Montants en millimes (`integer`) en base pour éviter les arrondis ; formatage « 12 638 TND » côté front.

## Règles de validation (identiques front et back)

- **Nom & prénom** : 3 à 80 caractères après trim. Erreur : « Écris ton nom et ton prénom. » (vide : « Ton nom aide le livreur à te trouver. »)
- **Téléphone** : 8 chiffres après suppression des espaces, premier chiffre dans `2 3 4 5 7 9`. Stocké en `+216XXXXXXXX`. Erreurs : « Il manque N chiffre(s) (8 au total). », « Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9. », vide : « Ton numéro nous sert à confirmer la commande sur WhatsApp. »
- **Gouvernorat** : un des 24 (Ariana, Béja, Ben Arous, Bizerte, Gabès, Gafsa, Jendouba, Kairouan, Kasserine, Kébili, Le Kef, Mahdia, La Manouba, Médenine, Monastir, Nabeul, Sfax, Sidi Bouzid, Siliana, Sousse, Tataouine, Tozeur, Tunis, Zaghouan). Erreur : « Choisis où te livrer. »
- Anti-doublon : même téléphone + même produit dans les 30 min → renvoyer la commande existante, ne pas en créer une seconde.

Référence d'implémentation : `formatTnPhone`, `validateTnPhone`, `GOVERNORATES` dans `design/components-reference/bundle.js`.

## Endpoints

### Public (boutique)

| Méthode | Route | Corps / paramètres | Réponse |
| --- | --- | --- | --- |
| `POST` | `/api/orders` | `{ customerName, phone (8 chiffres), governorate, productSku, quantity: 1, source?, website (honeypot, doit être vide) }` | `201 { ref, amountTnd, status: "NEW", whatsappConfirmUrl, trackingUrl }` · `422` erreurs par champ (mêmes messages qu'au-dessus) · `429` trop de tentatives |
| `GET` | `/api/orders/{ref}/tracking?t={token}` | jeton signé du lien de suivi | `{ ref, status, steps[], carrier, trackingNumber, amountTnd, governorate, eta }` — sans téléphone ni nom complet |

### Webhook

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/api/webhooks/whatsapp` | vérification Meta (`hub.verify_token`) |
| `POST` | `/api/webhooks/whatsapp` | messages entrants : vérifier la signature `X-Hub-Signature-256`, retrouver la commande par téléphone (dernière `NEW`/`PENDING`), et si le texte ressemble à une confirmation (`oui`, `OUI`, `ok`, `نعم`, `ey`…) → `CONFIRMED` ; sinon enregistrer le message pour l'agent |

### Admin (JWT)

| Méthode | Route | Rôle |
| --- | --- | --- |
| `POST` | `/api/auth/login` | email + mot de passe → JWT + refresh |
| `GET` | `/api/admin/orders?status=&q=&page=` | liste / recherche (#ref, nom, téléphone) |
| `GET` | `/api/admin/orders/counts` | `{ NEW: 14, PENDING: 8, CONFIRMED: 24, SHIPPED: 5 }` pour les en-têtes de colonnes |
| `GET` | `/api/admin/orders/{id}` | détail + événements + messages |
| `PATCH` | `/api/admin/orders/{id}/status` | `{ status, carrier?, trackingNumber?, note? }` — transitions autorisées uniquement (schéma plus haut) |
| `POST` | `/api/admin/orders/{id}/messages/generate` | `{ tone: "amical" | "direct" | "relance" }` → `{ body }` (texte modifiable) |
| `POST` | `/api/admin/orders/{id}/messages/send` | `{ body }` → envoie via WhatsApp, enregistre le message |
| `GET` | `/api/admin/orders/{id}/delivery-slip.pdf` | bon de livraison à imprimer |
| `GET` | `/api/admin/stats/kpis?month=2026-11` | commandes, CA commandé, taux de retour, à confirmer, variations vs mois précédent |
| `GET` | `/api/admin/stats/finance?month=` | CA commandé, encaissé, retours, en cours, frais transporteur, net, série par semaine |
| `GET` | `/api/admin/stats/governorates?month=` | par gouvernorat : commandes, livrées, retours, CA encaissé, part |
| `GET` / `PATCH` | `/api/admin/stock` | pièces, coûts, quantités, seuils ; packs assemblables (min des pièces) ; alerte si packs complets < 5 |

Formules (écran Finances) : CA encaissé = Σ montants `DELIVERED` ; taux d'encaissement = encaissé ÷ commandé ; CA net = encaissé − frais transporteur × colis expédiés ; marge par pack = prix − COGS (Σ pièces) − frais transporteur.

## Flux WhatsApp

1. Le client valide le checkout → `POST /api/orders` → commande `NEW`.
2. L'écran de confirmation propose **« Ouvrir WhatsApp »** : lien `https://wa.me/<NUMERO_BOUTIQUE>?text=…` pré-rempli (« Je confirme ma commande SC-2951 »). C'est le client qui écrit en premier, ce qui ouvre la fenêtre de conversation de 24 h où la boutique peut répondre librement.
3. Le webhook reçoit le message → `CONFIRMED`, et l'API répond avec le récapitulatif et le lien de suivi.
4. Si le client ne l'a pas fait, l'agent utilise **« WhatsApp »** sur la carte. Hors fenêtre de 24 h, la plateforme WhatsApp Business n'autorise qu'un **message modèle (template) pré-approuvé par Meta** pour écrire en premier : prévoir un template `order_confirmation` avec variables (prénom, pack, gouvernorat, montant). Le texte libre généré par l'IA sert dans la fenêtre de 24 h ou par copier-coller depuis le WhatsApp Business de l'agent. Vérifier ces règles dans la doc Meta au moment de l'intégration.
5. Sans réponse après le délai choisi (ex. 6 h) → `PENDING`, l'agent relance (ton « Relance »).

Ton des messages (générateur IA) : tutoiement, 1 à 2 phrases, prénom, pack, gouvernorat, montant en TND, appel à répondre « OUI ». Exemples dans `design/screens/AdminCommande.dc.html`.
