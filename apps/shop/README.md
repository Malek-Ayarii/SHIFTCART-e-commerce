# SHIFT CART — boutique (`apps/shop`)

Next.js 16 (App Router, RSC, Cache Components) · Tailwind CSS v4 · lucide-react.

```bash
cp .env.example .env.local      # API_URL=http://localhost:8090 …
pnpm dev                        # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e                   # optional: mock API on :8099 + dev server on :3100
                                # (needs Playwright browsers, or PW_CHROMIUM_PATH=<chrome.exe>)
```

Routes: `/` (landing mobile + desktop, checkout bottom sheet / modal), `/merci/[ref]`, `/suivi`, `/suivi/[ref]?t=`,
`/livraison`, `/dev/ui` (component gallery, development only).

- The checkout posts through a Server Action (`app/actions/submit-order.ts`) that re-validates with zod and calls
  `POST {API_URL}/api/orders` server-side; confirmation data goes into the httpOnly `sc_order` cookie (1 h).
- Validation rules/messages: `lib/validation.ts` (shared by the form and the server schema `lib/order-schema.ts`).
- Reviews: `data/reviews.json` is a **placeholder** (hidden in production until real reviews replace it).
- Fonts are served from `public/fonts` (copies of `design/fonts`) so the landing can preload exactly Syne 800 + Jakarta 400/700.
