# NEXO SHIFT — API

API REST de NEXO SHIFT : commandes COD de la boutique, suivi public signé, webhook WhatsApp,
back-office (commandes, messages IA, bon de livraison PDF, stats, stock) et auth admin.

Spring Boot 3.5 · Java 21 · Maven (wrapper) · PostgreSQL 17 · Flyway · Spring Security (JWT HS256) · OpenPDF.
Contrat JSON : [`docs/CONTRACT.md`](../../docs/CONTRACT.md) · sens métier : [`docs/API.md`](../../docs/API.md).

## Lancer en local

```bash
# 1. Postgres (depuis la racine du dépôt) : localhost:5600, base/utilisateur/mdp = nexoshift
docker compose up -d

# 2. API avec les données de démo (profil dev), sur http://localhost:8090
cd apps/api
SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run        # Git Bash / macOS / Linux
# PowerShell : $env:SPRING_PROFILES_ACTIVE="dev"; .\mvnw.cmd spring-boot:run
```

Compte admin créé au premier démarrage : `admin@nexoshift.tn` / `nexoshift-dev` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
Toutes les variables sont listées dans [`.env.example`](.env.example).

Essai rapide :

```bash
curl -s -X POST localhost:8090/api/orders -H 'Content-Type: application/json' \
  -d '{"customerName":"Mohamed Ben Ali","phone":"98765432","governorate":"Sousse","productSku":"PACK-BARISTA","quantity":1,"website":""}'
curl -s -X POST localhost:8090/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@nexoshift.tn","password":"nexoshift-dev"}'
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `./mvnw verify` | compile (avertissements `-Xlint:all` = erreurs), tests unitaires + intégration (Testcontainers : Docker requis) |
| `./mvnw test -Dtest=OrderApiTest` | une classe de tests |
| `./mvnw spring-boot:run` | démarrer |
| `./mvnw package -DskipTests` | jar exécutable `target/nexoshift-api-*.jar` |

## Organisation

```
com.nexoshift
├── common     config (AppProperties, Clock, HttpClient), error (formes d'erreur du contrat), money (millimes ⇄ TND),
│              phone (validation +216, affichage, masquage), ratelimit, security (JWT, CORS), time (mois Africa/Tunis)
├── order      commandes : création publique, suivi signé, admin (liste, compteurs, détail, statuts), bon de livraison
├── whatsapp   liens wa.me, client Cloud API (texte / modèle), webhook (signature, confirmation « OUI »)
├── messages   messages (entité), gabarits, générateur IA (API Anthropic), envoi
├── stats      KPI, finances, gouvernorats
├── stock      pièces, nomenclature, assemblage
└── auth       login / refresh (rotation) / logout / me, seed du compte admin
```

Migrations Flyway : `db/migration` (schéma + données de référence, toujours) et `db/dev` (démo, profil `dev` uniquement :
~60 commandes fictives `utm_source = 'demo'` sur octobre–novembre 2026, coûts d'exemple). Montants en **millimes** en base,
en **TND** (nombres JSON simples : `89`, `41.5`) dans l'API.

## Endpoints

Public : `POST /api/orders`, `GET /api/orders/{ref}/tracking?t=`, `GET|POST /api/webhooks/whatsapp`,
`POST /api/auth/login|refresh|logout`, `GET /actuator/health`.
JWT (`Authorization: Bearer`) : `GET /api/auth/me`, `/api/admin/orders…`, `/api/admin/stats/{kpis,finance,governorates}`,
`GET|PATCH /api/admin/stock`, `POST /api/admin/stock/assemble`.

### Règles notables

- **POST /api/orders** — ordre des contrôles : limite IP (5 / 10 min) → honeypot `website` (201 `SC-0000`, rien
  d'enregistré) → validation (422, messages exacts) → anti-doublon 30 min même téléphone + produit (200, commande
  existante) → limite téléphone (3 / 30 min) → création (201). Limites en mémoire (une instance).
- **IP client** : `FORWARD_HEADERS_STRATEGY=native` (défaut) — Tomcat ne croit `X-Forwarded-For` que s'il vient d'un
  proxy interne (127.x, 10.x, 192.168.x, 172.16–31.x, ::1). La boutique (Server Action) transmet l'IP du visiteur ;
  si elle tourne sur une IP publique, l'ajouter à `SERVER_TOMCAT_REMOTEIP_INTERNAL_PROXIES` (regex), sinon toutes les
  commandes partagent son IP. En local sans proxy devant Next.js, la boutique n'a pas d'IP visiteur à transmettre :
  toutes les commandes comptent pour 127.0.0.1 (5 / 10 min).
- **Secrets** : `JWT_SECRET`, `TRACKING_TOKEN_SECRET` et `ADMIN_PASSWORD` n'ont de valeur par défaut qu'en profil `dev`.
  Hors `dev`/`test`, l'API refuse de démarrer sans eux ou avec les valeurs de dev.
- **Jeton de suivi** = HMAC-SHA256(ref, `TRACKING_TOKEN_SECRET`) base64url ; la base garde son SHA-256.
- **Téléphones** : jamais en clair dans les logs (`+216 98 ••• 432`), jamais dans le suivi public ni dans les URLs.
- **WhatsApp — texte ou modèle ?** Le texte libre n'est permis que dans les 24 h suivant le dernier message reçu du
  client. `POST …/messages/send` envoie donc le texte si le client a écrit il y a moins de 24 h, sinon le modèle Meta
  `order_confirmation` (prénom, pack, gouvernorat, montant) ; le texte de l'agent est enregistré dans l'historique.
  Sans `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`, statut `SIMULATED`.
- **Webhook** : signature `X-Hub-Signature-256` vérifiée sur le corps brut (403 sinon), traitement idempotent par
  `wamid`. Message de confirmation (« oui », « ok », « نعم », « ey », « d'accord », « Je confirme ma commande SC-… »…)
  sur la commande citée ou la dernière `NEW`/`PENDING` du numéro → `CONFIRMED` (acteur `system`) + récapitulatif avec
  lien de suivi. Tout message entrant est enregistré.
- **Messages IA** : avec `LLM_API_KEY`, appel `POST https://api.anthropic.com/v1/messages` (modèle `LLM_MODEL`,
  délai 10 s) ; sinon ou en cas d'échec, gabarits de `MessageTemplates`.
- **Statuts** : `NEW→CONFIRMED|PENDING|CANCELLED`, `PENDING→CONFIRMED|CANCELLED`, `CONFIRMED→SHIPPED|CANCELLED`,
  `SHIPPED→DELIVERED|RETURNED`, sinon 409. `SHIPPED` : transporteur `YALIDINE` par défaut, −1 pack complet (≥ 0).
- **Stats** (cohorte des commandes créées dans le mois, heure de Tunis) : voir la Javadoc de `StatsService`.

## [À DÉFINIR]

`WHATSAPP_SHOP_NUMBER`, identifiants WhatsApp Cloud API + modèle `order_confirmation` à faire approuver par Meta,
`CARRIER_FEE_TND` (7 = exemple), coûts unitaires et quantités réels des pièces (0 en production),
délai de passage automatique en attente (`ORDER_AUTO_PENDING_HOURS`, désactivé).
