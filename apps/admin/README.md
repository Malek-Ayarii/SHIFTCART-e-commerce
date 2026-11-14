# SHIFT CART — back-office (`apps/admin`)

Angular 22 (standalone, signals, `@if/@for`, zoneless) · Tailwind CSS 4 (`@tailwindcss/postcss`) · `@lucide/angular` · Angular CDK drag-drop.
Design : `design/tokens.css` + `design/tailwind-theme.css` importés par `src/styles.css` (polices `design/fonts` embarquées au build), logos copiés dans `public/assets/logos`.

## Lancer

```bash
docker compose up -d                    # Postgres (racine du repo, port 5600)
cd apps/api && ./mvnw spring-boot:run   # API sur http://localhost:8090 (profil dev = données de démo)
pnpm --filter admin start               # http://localhost:4300 (proxy /api → http://localhost:8090)
```

Compte dev créé par l'API : `admin@shiftcart.tn` / `shiftcart-dev`.

## Scripts

| Script | Rôle |
| --- | --- |
| `pnpm start` / `pnpm dev` | serveur de dev, port 4300, `proxy.conf.json` |
| `pnpm build` | build de production (`dist/admin/browser`, statique) |
| `pnpm lint` | angular-eslint (TS + templates, règles d'accessibilité) |
| `pnpm typecheck` | `tsc` sur `tsconfig.app.json` et `tsconfig.spec.json` |
| `pnpm test` | tests unitaires Vitest (jsdom), non interactif |

## Routes

| Route | Écran (docs/SPEC.md) |
| --- | --- |
| `/login` | connexion (email + mot de passe) |
| `/` | C1 tableau de bord (KPI + Kanban) ; < 768px : C5 liste mobile |
| `/commandes/:id` | C2 commande + message WhatsApp IA (`?tone=amical|direct|relance`) |
| `/messages` | commandes Nouvelles / En attente à confirmer |
| `/finances` | C3 finances + gouvernorats |
| `/stock` | C4 stock & marges |

## Configuration

`src/environments/environment.ts` (prod) et `environment.development.ts` (dev) :

- `apiUrl` : vide = même origine (`/api/...`). En prod, servir l'admin derrière le même domaine que l'API ou un reverse proxy `/api`.
- `agentWhatsappNumber` : numéro WhatsApp de l'agent stock pour « Alerter l'agent » — **[À DÉFINIR]**.
- `demoDataBadge` : badge « Données de démo » (vrai en dev, faux en prod).
- `pollIntervalMs` : rafraîchissement du Kanban (30 s, en pause quand l'onglet est masqué).

Auth : access token JWT en mémoire uniquement, refresh par cookie httpOnly `sc_refresh` (`/api/auth/refresh`), intercepteur Bearer + un seul refresh sur 401 puis renvoi vers `/login`.
