# Ordre de construction (prompts prêts à coller dans Claude Code)

Une phase par session. À la fin de chaque phase : lint, typecheck, tests, et comparaison avec les maquettes.

### Phase 0 — Monorepo
> Lis CLAUDE.md et docs/STACK.md. Crée le monorepo : pnpm workspaces, `apps/shop` (Next.js, TypeScript, Tailwind v4), `apps/admin` (Angular standalone, Tailwind v4), `apps/api` (Spring Boot 3, Java 21, Maven, Web/Validation/JPA/Security/Flyway/PostgreSQL), `docker-compose.yml` avec Postgres, scripts lint/typecheck/test. Importe `design/tokens.css` et `design/tailwind-theme.css` dans le CSS global des deux fronts et affiche une page de test avec `bg-surface text-ink`, un bouton `bg-orange text-on-orange rounded-lg` et un titre `text-display-xl`. Propose le plan avant de coder.

### Phase 1 — Kit UI de la boutique
> Implémente dans `apps/shop/components/ui` les composants Button, Icon (lucide-react, correspondance des noms dans STACK.md), Wordmark/logo, Navbar, PriceTag, ProductCard, SavingsCalculator, IncludedList, ReviewCard, StickyCta, BottomSheet, TextField, PhoneInput, GovernorateSelect, StatusBadge. Pour chacun, lis `design/components-reference/<Nom>/README.md`, `index.d.ts` et le CSS correspondant dans `bundle.css` ; garde les mêmes props, textes et états. Polices via next/font/local depuis `design/fonts`. Ajoute une page `/dev/ui` qui affiche tous les composants dans leurs états.

### Phase 2 — Landing mobile + desktop
> Construis `/` d'après `design/screens/Main.dc.html` (mobile) et `design/screens/WebLanding.dc.html` (≥1024px), sections et textes exacts de docs/SPEC.md A1 et B1. Landing statique, seuls les éléments interactifs en Client Components. Vérifie le budget de performance de STACK.md.

### Phase 3 — API commandes
> Dans `apps/api` : entités, migrations Flyway et endpoints publics de docs/API.md (`POST /api/orders`, `GET /api/orders/{ref}/tracking`), validation identique au front, anti-doublon, rate limiting, honeypot, jeton de suivi signé. Tests d'intégration avec Testcontainers.

### Phase 4 — Checkout, confirmation, suivi
> Branche le tiroir de checkout (SPEC A3–A5, B2) sur `POST /api/orders` via un Server Action avec zod, puis crée `/merci/[ref]` (A6) et `/suivi/[ref]` (A7). Gère chargement, erreurs réseau et accessibilité du tiroir (focus, Échap). Lien « Ouvrir WhatsApp » pré-rempli avec `NEXT_PUBLIC_WHATSAPP_NUMBER`.

### Phase 5 — Admin : gabarit + Kanban
> Dans `apps/admin` : login JWT, gabarit avec barre latérale (SPEC C), tableau de bord C1 avec KpiCard et Kanban (Angular CDK drag-drop, ← → au clavier, mise à jour optimiste via `PATCH /api/admin/orders/{id}/status`), vue mobile C5. Endpoints admin correspondants côté API.

### Phase 6 — WhatsApp + message IA
> Implémente le flux de docs/API.md › Flux WhatsApp : webhook Cloud API (vérification + signature), confirmation automatique sur « OUI », génération du message par ton (`/messages/generate`), envoi (`/messages/send`), écran C2. Prévois le template Meta pour l'envoi hors fenêtre de 24 h et signale ce qu'il faut configurer côté Meta.

### Phase 7 — Finances et stock
> Écrans C3 et C4 + endpoints `stats/*` et `stock` (formules dans docs/API.md). Alerte stock < 5 packs dans la barre latérale. Remplace toutes les données de démo par les vraies requêtes.

### Phase 8 — Finitions
> Audit accessibilité (clavier, contrastes en clair et sombre, labels), Lighthouse mobile sur la landing, tests e2e Playwright du parcours achat (landing → tiroir → erreurs → confirmation) et du parcours agent (Kanban → message → confirmée → expédiée).
