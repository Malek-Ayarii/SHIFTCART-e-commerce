# Stack technique

Trois applications dans un monorepo, qui partagent un seul design (`design/`).

| App | Rôle | Techno | Déploiement conseillé |
| --- | --- | --- | --- |
| `apps/shop` | Boutique client (landing, checkout, confirmation, suivi) | **Next.js** (App Router, TypeScript, React Server Components) + **Tailwind CSS v4** + `lucide-react` | Vercel (région Europe) ou Node derrière un CDN |
| `apps/admin` | Back-office équipe (Kanban COD, message WhatsApp IA, finances, stock) | **Angular** (standalone components, signals, nouveau control flow `@if/@for`) + **Tailwind CSS v4** + `lucide-angular` + **Angular CDK drag-drop** | Statique (Netlify, Vercel, Nginx) |
| `apps/api` | API REST, règles métier, WhatsApp, stats | **Spring Boot 3** (Java 21) : Web, Validation, Data JPA, Security (JWT), Flyway + **PostgreSQL** | VPS / Render / Railway + Postgres managé |

Le brief prévoit Next.js pour la boutique et Angular pour l'admin. Le backend n'était pas fixé : Spring Boot est un choix par défaut, qu'on peut remplacer (par exemple NestJS) sans toucher aux deux fronts, puisqu'ils ne parlent qu'à l'API REST décrite dans `docs/API.md`.

Prendre la dernière version stable de chaque outil au moment du scaffolding et l'épingler dans les lockfiles.

## Arborescence cible

```
nexoshift/
├── CLAUDE.md
├── docs/                    STACK.md · SPEC.md · API.md · ROADMAP.md
├── design/                  source de vérité visuelle (ne pas dupliquer)
│   ├── tokens.json          valeurs : couleurs (thèmes clair/sombre), typo, espacements, rayons, ombres
│   ├── tokens.css           variables CSS + @font-face (généré)
│   ├── tailwind-theme.css   thème Tailwind v4 (généré)
│   ├── fonts/               Syne 700/800, Plus Jakarta Sans 400–800 (WOFF2, latin)
│   ├── logos/               logo complet, pictogramme, wordmark (PNG transparents) + original
│   ├── BRAND.md             guide de marque
│   ├── components-reference/  implémentation de référence + README + index.d.ts de chaque composant
│   └── screens/             maquette .dc.html de chaque écran
├── apps/
│   ├── shop/                Next.js
│   ├── admin/               Angular
│   └── api/                 Spring Boot
├── docker-compose.yml       Postgres local (+ Mailpit si besoin)
└── .claude/commands/        commandes Claude Code du projet
```

Gestion du monorepo : **pnpm workspaces** pour `shop` et `admin` (Maven ou Gradle pour `api`, indépendant). Pas besoin de Nx/Turbo au départ.

## Design dans chaque front

CSS global de chaque app :

```css
@import "tailwindcss";
@import "../../../design/tokens.css";          /* adapter le chemin */
@import "../../../design/tailwind-theme.css";
```

- Utilitaires disponibles : `bg-surface`, `bg-surface-raised`, `bg-surface-sunken`, `text-ink`, `text-ink-muted`, `bg-orange`, `text-on-orange`, `text-orange-ink`, `bg-orange-soft`, `text-success`/`bg-success-soft` (idem warning, info, danger), `border-line`, `border-line-strong`, `rounded-sm|md|lg|sheet|pill`, `shadow-card|lift|sheet|phone`, `font-display`, `font-sans`, et les styles typo `text-display-xl`, `text-display-lg`, `text-price`, `text-kpi`, `text-heading`, `text-cta`, `text-title`, `text-body`, `text-body-sm`, `text-label`.
- Thème sombre : `data-theme="dark"` sur `<html>`. Clair par défaut.
- Polices : `next/font/local` dans `shop` (fichiers de `design/fonts`), `@font-face` de `tokens.css` dans `admin`.
- Icônes : Lucide (`lucide-react`, `lucide-angular`), trait 2, tailles 16/20/24. Correspondance des noms de référence : `cart`→`ShoppingCart`, `whatsapp`→`MessageCircle`, `thermo`→`Thermometer`, `pin`→`MapPin`, `refresh`→`RefreshCw`, `undo`→`RotateCcw`, `trendUp`/`trendDown`→`TrendingUp`/`TrendingDown`, `grip`→`GripVertical`, `shield`→`ShieldCheck`, `alert`→`CircleAlert`, `chevronDown`→`ChevronDown`, les autres ont le même nom (`Menu`, `Zap`, `Coffee`, `Gift`, `Banknote`, `Truck`, `Clock`, `Printer`, `Package`, `Star`, `Check`, `X`, `Calendar`, `Play`, `Pause`).

## Choix techniques par app

**shop (Next.js)**
- Landing rendue statiquement (SSG + revalidation) ; seuls le calculateur, le tiroir de checkout, le CTA collant et la vidéo sont des Client Components.
- Checkout : un **Server Action** (ou une route handler) qui valide avec **zod** puis appelle `POST /api/orders`. Mêmes règles de validation côté client (`docs/API.md`).
- Bottom sheet : `<dialog>` natif ou Radix Dialog ; piège du focus, Échap, retour du focus (voir `components-reference/BottomSheet/README.md`). Sur desktop, même formulaire dans une fenêtre centrée.
- Suivi de commande : page `/suivi/[ref]` protégée par un jeton signé reçu dans le message WhatsApp (pas de compte).
- Analytics légers (Meta Pixel + événements `ViewContent`, `InitiateCheckout`, `Lead`) chargés après interaction, pas au chargement.

**admin (Angular)**
- Routes : `/` (tableau de bord + Kanban), `/commandes/:id`, `/finances`, `/stock`, `/login`.
- Kanban : `cdkDropListGroup` + une `cdkDropList` par statut ; déplacement au clavier (← →) en plus du glisser.
- État : signals + services HTTP ; rafraîchissement des nouvelles commandes toutes les 30 s (ou SSE plus tard).
- Auth : JWT de l'API, stocké en mémoire + refresh token en cookie httpOnly.
- Responsive : sous 768 px, le Kanban devient la liste filtrable de l'écran « Équipe — commandes (mobile) ».

**api (Spring Boot)**
- Couches : `order`, `whatsapp`, `stats`, `stock`, `auth`. DTO + validation Bean Validation, Flyway pour le schéma.
- WhatsApp : **WhatsApp Business Platform (Cloud API)** de Meta, webhook entrant pour les réponses « OUI ».
- Génération du message IA : un appel à une API de LLM (clé en variable d'environnement) avec un prompt court et les variables de la commande ; le texte reste modifiable avant envoi.
- Rate limiting sur `POST /api/orders` (par IP et par téléphone) + champ honeypot contre le spam.
- CORS limité aux domaines `shop` et `admin`.

## Variables d'environnement

| Variable | App | Rôle |
| --- | --- | --- |
| `API_URL` | shop, admin | URL de l'API |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | shop | numéro de la boutique au format international (`216XXXXXXXX`) — **[À DÉFINIR]** |
| `NEXT_PUBLIC_META_PIXEL_ID` | shop | pixel Meta — **[À DÉFINIR]** |
| `TRACKING_TOKEN_SECRET` | api | signature des liens de suivi |
| `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD` | api | PostgreSQL |
| `JWT_SECRET` | api | auth admin |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` | api | Cloud API + vérification du webhook |
| `LLM_API_KEY` | api | génération du message IA |
| `AGENTS_API_KEY` | api | agents IA du back-office (`/agents`) ; vide = `LLM_API_KEY`, puis `ANTHROPIC_API_KEY` |
| `AGENTS_MODEL` | api | modèle des agents (défaut `claude-opus-5-5`) |
| `CARRIER_FEE_TND` | api | frais transporteur par colis (7 TND dans les maquettes = exemple) — **[À DÉFINIR]** |
| `ALLOWED_ORIGINS` | api | CORS |

## Commandes (à créer pendant le scaffolding)

```bash
docker compose up -d                 # Postgres local
pnpm --filter shop dev               # http://localhost:3000
pnpm --filter admin start            # http://localhost:4200
cd apps/api && ./mvnw spring-boot:run  # http://localhost:8080
pnpm -r lint && pnpm -r typecheck && pnpm -r test
cd apps/api && ./mvnw verify
```

## Budget de performance (landing mobile)

- JS client de la landing < 90 Ko gzip ; LCP < 2 s en 4G simulée ; CLS < 0,05.
- Polices : seulement Syne 800 et Jakarta 400/700 préchargées sur la landing.
- Vidéo UGC : MP4 ≤ 15 s, ≤ 1,5 Mo, poster WebP ≤ 40 Ko, rien chargé avant le tap.
