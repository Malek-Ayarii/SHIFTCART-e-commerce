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

- Numéro WhatsApp Business de la boutique, ID du pixel Meta, tarif réel du transporteur.
- Vrais avis clients, vraie vidéo UGC + poster, photos produit.
- Coûts réels des pièces (écran Stock) — les chiffres des maquettes Finances/Stock sont des exemples.
- Compte Meta WhatsApp Business Platform + template de confirmation approuvé.

## Lancer en local

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

# 3. Boutique Next.js → http://localhost:3000
cd apps/shop
cp .env.example .env.local          # API_URL=http://localhost:8090
pnpm dev                            # ou : pnpm build && pnpm start

# 4. Back-office Angular → http://localhost:4300 (proxy /api → http://localhost:8090)
cd apps/admin
pnpm start
```

**Identifiants admin (profil dev uniquement)** : `admin@shiftcart.tn` / `shiftcart-dev`. Hors profil dev, `ADMIN_PASSWORD`, `JWT_SECRET` et `TRACKING_TOKEN_SECRET` (≥ 32 caractères) sont obligatoires, sinon l'API refuse de démarrer.

**Données de démo** : la migration `apps/api/src/main/resources/db/dev` (~60 commandes oct./nov. 2026, coûts d'exemple) n'est chargée qu'avec le profil `dev`. Le back-office (build de développement, `pnpm start`) affiche le badge « Données de démo ».

### Variables d'environnement

| App | Variable | Rôle |
| --- | --- | --- |
| api | `SPRING_PROFILES_ACTIVE` | `dev` en local ; vide en production |
| api | `DATABASE_URL` / `DATABASE_USER` / `DATABASE_PASSWORD` | défaut `jdbc:postgresql://localhost:5600/shiftcart`, `shiftcart` / `shiftcart` |
| api | `JWT_SECRET`, `TRACKING_TOKEN_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | obligatoires hors dev |
| api | `SHOP_PUBLIC_URL`, `ALLOWED_ORIGINS` | défauts `http://localhost:3000` et `http://localhost:3000,http://localhost:4300` |
| api | `WHATSAPP_SHOP_NUMBER`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | WhatsApp ; sans token, les envois sont `SIMULATED` |
| api | `LLM_API_KEY`, `LLM_MODEL` | messages IA ; sans clé, gabarits déterministes |
| api | `CARRIER_FEE_TND`, `ORDER_AUTO_PENDING_HOURS` | frais transporteur, passage auto NEW → PENDING (0 = désactivé) |
| api | `ORDER_RATE_LIMIT_IP_MAX` | 5 commandes / 10 min par IP. En local sans proxy, toutes les commandes viennent de 127.0.0.1 : monte-le (ex. `100`) pour des tests répétés |
| shop | `API_URL` | URL de l'API, côté serveur uniquement (défaut `http://localhost:8090`) |
| shop | `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_STORY_VIDEO_SRC`, `NEXT_PUBLIC_STORY_VIDEO_POSTER` | voir `apps/shop/.env.example` |
| admin | `agentWhatsappNumber` (`src/environments/*.ts`) | numéro de l'agent pour « Alerter l'agent » |

Toutes les variables de l'API sont documentées dans `apps/api/.env.example`.

### Vérifications

```bash
pnpm -r lint && pnpm -r typecheck && pnpm -r test   # boutique + back-office
cd apps/api && ./mvnw -q verify                      # API (Testcontainers : Docker requis)
```

### [À DÉFINIR] avant la mise en ligne

- Numéro WhatsApp de la boutique (`WHATSAPP_SHOP_NUMBER` côté API, `NEXT_PUBLIC_WHATSAPP_NUMBER` côté boutique). Sans lui, la page de confirmation affiche une note « [À DÉFINIR] » au lieu du bouton de confirmation WhatsApp.
- Compte WhatsApp Business Cloud API (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`) et approbation du modèle Meta `order_confirmation`.
- Numéro WhatsApp de l'agent stock (`agentWhatsappNumber` du back-office).
- Tarif réel du transporteur (`CARRIER_FEE_TND` ; 7 = valeur d'exemple des maquettes).
- Coûts réels des pièces (à 0 en production, à saisir dans l'écran Stock).
- Délai de passage automatique en attente (`ORDER_AUTO_PENDING_HOURS`).
- ID du pixel Meta (`NEXT_PUBLIC_META_PIXEL_ID`).
- Vidéo UGC + poster (`NEXT_PUBLIC_STORY_VIDEO_SRC` / `_POSTER`), vrais avis clients (les avis de démo sont masqués en production), politique de retour et détails transporteur de la page « Livraison & retours ».
- Clé API Anthropic (`LLM_API_KEY`) pour les messages IA (optionnelle).

Maquettes en ligne : https://claude.ai/artifact/8BLcnRQjn3qWuaZ2ArZzrc · Design system : https://claude.ai/artifact/FAe8h8xVbqsZo5geVJr1ta
