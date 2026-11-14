# SHIFT CART — dossier de démarrage pour Claude Code

Tout ce qu'il faut pour que Claude Code construise la boutique (Next.js), le back-office (Angular) et l'API (Spring Boot) à partir de l'UI déjà conçue.

## Démarrer

1. Décompresse ce dossier : il devient la racine de ton repo (`git init`).
2. Ouvre le dossier dans un terminal et lance `claude`.
3. Colle le prompt de la **Phase 0** de `docs/ROADMAP.md`, puis une phase par session.
4. Pour un écran précis : `/ecran Suivi de commande`. Pour contrôler un écran fini : `/verifier-ui Landing`.

Claude Code lit `CLAUDE.md` automatiquement à chaque session.

## Contenu

| Chemin | Rôle |
| --- | --- |
| `CLAUDE.md` | règles du projet pour Claude Code |
| `docs/STACK.md` | stack, architecture, variables d'environnement, commandes |
| `docs/SPEC.md` | les 13 écrans en détail (+ checkout desktop à construire) |
| `docs/API.md` | modèle de données, endpoints, statuts, flux WhatsApp |
| `docs/ROADMAP.md` | 9 phases avec le prompt de chacune |
| `design/` | tokens, thème Tailwind, polices, logos, guide de marque, composants de référence, maquettes des écrans |
| `.claude/commands/` | `/ecran` et `/verifier-ui` |

## À compléter avant la mise en ligne

- ID du pixel Meta, tarif réel du transporteur (numéro WhatsApp de la boutique : +216 92 184 592).
- Vrais avis clients, vraie vidéo UGC + poster, photo du Pack Setup, prix définitif du Pack Meal Prep (99 TND provisoire).
- Coûts réels des pièces (écran Stock) — les chiffres des maquettes Finances/Stock sont des exemples.
- Compte Meta WhatsApp Business Platform + template de confirmation approuvé.

## Lancer en local (v2 — catalogue multi-packs)

Prérequis : Docker, Java 21, Node 24, pnpm 10. Ports utilisés : Postgres `5600`, API `8090`, boutique `3000`, back-office `4300` (5432, 8080 et 4200 sont pris par d'autres projets sur cette machine).

```bash
# 0. Dépendances front (une fois, depuis la racine)
pnpm install

# 1. Base de données (conteneur shiftcart-postgres, localhost:5600, base/utilisateur/mdp shiftcart)
docker compose up -d

# 2. API Spring Boot, profil dev (données de démo + secrets de dev) → http://localhost:8090
cd apps/api
./mvnw -q -DskipTests package
SPRING_PROFILES_ACTIVE=dev java -jar target/shiftcart-api-0.1.0-SNAPSHOT.jar
#   (ou : SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run)
#   santé : curl http://localhost:8090/actuator/health → {"status":"UP"}
#   Au démarrage, Flyway migre une base v1 en v2 (V3 catalogue + V3.1 démo) et l'amorceur
#   importe les photos des packs (seed/packs/<slug>.png), une seule fois par pack.

# 3. Boutique Next.js → http://localhost:3000
cd apps/shop
cp .env.example .env.local          # API_URL=http://localhost:8090, NEXT_PUBLIC_WHATSAPP_NUMBER=21692184592
pnpm dev                            # ou : API_URL=http://localhost:8090 pnpm build && pnpm start
#   API_URL doit être défini AU BUILD : la réécriture /media/:id → ${API_URL}/api/media/:id est figée à ce moment.

# 4. Back-office Angular → http://localhost:4300 (proxy /api → http://localhost:8090)
cd apps/admin
pnpm start
```

**Identifiants admin (profil dev uniquement)** : `admin@shiftcart.tn` / `shiftcart-dev`. Hors profil dev, `ADMIN_PASSWORD`, `JWT_SECRET` et `TRACKING_TOKEN_SECRET` (≥ 32 caractères) sont obligatoires, sinon l'API refuse de démarrer.

### Ce que tu trouves en v2

- **Packs** (`GET /api/products`, gérés dans le back-office › Packs) :

  | Pack | Page boutique | SKU | Prix | État |
  | --- | --- | --- | --- | --- |
  | Le Pack Barista (phare) | `/packs/pack-barista` | `PACK-BARISTA` | 89 TND | actif |
  | Le Pack Setup & Productivité | `/packs/pack-setup-productivite` | `PACK-SETUP` | 79 TND (à confirmer) | actif |
  | Le Pack Espace Autonome | `/packs/pack-espace-autonome` | `PACK-ESPACE` | 79 TND | actif |
  | Le Pack Meal Prep | `/packs/pack-meal-prep` | `PACK-MEALPREP` | 99 TND (prix MVP provisoire) | actif |

- **Photos** : `design/photos/*.png` (copiées dans `apps/api/src/main/resources/seed/packs/`). Elles sont stockées en base (table `media`) et servies par `GET /api/media/{id}` (cache 1 an, `ETag`, 304) ; la boutique les sert en même origine sous `/media/{id}`. Le Pack Setup n'a pas encore de photo : la boutique affiche un visuel de marque à la place. Nouvelles photos : back-office › Packs › éditeur (JPEG, PNG ou WebP, 8 Mo max).
- **WhatsApp de la boutique** : **+216 92 184 592** (`21692184592`) — défaut de `WHATSAPP_SHOP_NUMBER` (API : profil dev et `.env.example`), de `NEXT_PUBLIC_WHATSAPP_NUMBER` (boutique) et de `shopWhatsappNumber` / `agentWhatsappNumber` (back-office, `src/environments/*.ts`).
- **Checkout à 4 champs** : nom & prénom, téléphone +216, gouvernorat et **adresse exacte** (rue, n°, quartier, ville ; 10 à 200 caractères, obligatoire). L'adresse n'apparaît ni dans les logs, ni dans une URL, ni sur `/merci` ou le suivi public (seulement « Livraison à {gouvernorat} ») ; le formulaire est vidé dès que la commande est passée. Elle est visible dans le détail de commande du back-office (« Copier l'adresse », « Ouvrir dans Maps ») et sur le bon de livraison PDF. Les commandes antérieures à la v2 portent « [Adresse non renseignée — commande passée avant la v2] ».

**Données de démo** : la migration `apps/api/src/main/resources/db/dev` (~60 commandes oct./nov. 2026 réparties sur les 3 packs actifs, adresses marquées « [Démo] », coûts d'exemple) n'est chargée qu'avec le profil `dev`. Le back-office (build de développement, `pnpm start`) affiche le badge « Données de démo ».

### Variables d'environnement

| App | Variable | Rôle |
| --- | --- | --- |
| api | `SPRING_PROFILES_ACTIVE` | `dev` en local ; vide en production |
| api | `DATABASE_URL` / `DATABASE_USER` / `DATABASE_PASSWORD` | défaut `jdbc:postgresql://localhost:5600/shiftcart`, `shiftcart` / `shiftcart` |
| api | `JWT_SECRET`, `TRACKING_TOKEN_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | obligatoires hors dev |
| api | `SHOP_PUBLIC_URL`, `ALLOWED_ORIGINS` | défauts `http://localhost:3000` et `http://localhost:3000,http://localhost:4300` |
| api | `WHATSAPP_SHOP_NUMBER` | `21692184592` (défaut en dev et dans `.env.example`) |
| api | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | WhatsApp Cloud API ; sans token, les envois sont `SIMULATED` |
| api | `LLM_API_KEY`, `LLM_MODEL` | messages IA ; sans clé, gabarits déterministes |
| api | `CARRIER_FEE_TND`, `ORDER_AUTO_PENDING_HOURS` | frais transporteur, passage auto NEW → PENDING (0 = désactivé) |
| api | `ORDER_RATE_LIMIT_IP_MAX` | 5 commandes / 10 min par IP. En local sans proxy, toutes les commandes viennent de 127.0.0.1 : monte-le (ex. `100`) pour des tests répétés |
| shop | `API_URL` | URL de l'API, côté serveur, **lue aussi au build** (réécriture `/media`) ; défaut `http://localhost:8090` |
| shop | `NEXT_PUBLIC_WHATSAPP_NUMBER` | `21692184592` |
| shop | `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_STORY_VIDEO_SRC`, `NEXT_PUBLIC_STORY_VIDEO_POSTER` | voir `apps/shop/.env.example` |
| admin | `shopWhatsappNumber`, `agentWhatsappNumber`, `shopUrl` (`src/environments/*.ts`) | numéros WhatsApp (`21692184592`) ; `shopUrl` = lien « Voir sur la boutique » (`http://localhost:3000` en dev) |

Toutes les variables de l'API sont documentées dans `apps/api/.env.example`.

### Vérifications

```bash
pnpm -r lint && pnpm -r typecheck && pnpm -r test   # boutique + back-office
cd apps/api && ./mvnw -q verify                      # API (Testcontainers : Docker requis)
cd apps/shop && npx playwright test                  # e2e boutique (API simulée :8099, boutique :3100)
```

### [À DÉFINIR] avant la mise en ligne

- **Prix du Pack Meal Prep** : 99 TND provisoire pour le MVP (migration `V4`), actif ; à ajuster dans le back-office.
- **Confirmation du prix du Pack Setup & Productivité** (79 TND en base).
- **Photo du Pack Setup & Productivité** (aucune fournie : visuel de marque de secours).
- **Coûts réels des pièces** de tous les packs (à 0 en production, à saisir dans l'écran Stock) ; décider si l'**Emballage** compte dans le coût du Pack Barista (sorti de sa composition v2, alors que l'exemple du contrat le comptait).
- **Descriptions longues des packs** (champ `description` vide pour les 4 packs).
- `shopUrl` du back-office en production (lien « Voir sur la boutique »).
- Compte WhatsApp Business Cloud API (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`) et approbation du modèle Meta `order_confirmation`.
- Numéro WhatsApp de l'agent stock (`agentWhatsappNumber`, réglé pour l'instant sur le numéro boutique).
- Tarif réel du transporteur (`CARRIER_FEE_TND` ; 7 = valeur d'exemple des maquettes).
- Délai de passage automatique en attente (`ORDER_AUTO_PENDING_HOURS`).
- ID du pixel Meta (`NEXT_PUBLIC_META_PIXEL_ID`).
- Vidéo UGC + poster (`NEXT_PUBLIC_STORY_VIDEO_SRC` / `_POSTER`), vrais avis clients (les avis de démo sont masqués en production), politique de retour et détails transporteur de la page « Livraison & retours ».
- Clé API Anthropic (`LLM_API_KEY`) pour les messages IA (optionnelle).

Maquettes en ligne : https://claude.ai/artifact/8BLcnRQjn3qWuaZ2ArZzrc · Design system : https://claude.ai/artifact/FAe8h8xVbqsZo5geVJr1ta
