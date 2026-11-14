# SHIFT CART — instructions pour Claude Code

SHIFT CART est une marque e-commerce D2C tunisienne. Elle vend des packs « routine » (le premier : **Pack Barista, 89 TND, livraison gratuite**) à des étudiants et jeunes actifs de 19 à 30 ans. Paiement **uniquement à la livraison (COD)**, confirmation **par WhatsApp**, achat d'impulsion en un clic, sans compte ni panier.

L'UI est déjà conçue. Ton travail est de l'**implémenter fidèlement**, pas de la réinventer.

## Lire avant de coder

1. `docs/STACK.md` — stack, architecture du monorepo, commandes, variables d'environnement.
2. `docs/SPEC.md` — les 13 écrans : route, app, composants, états, données, comportements.
3. `docs/API.md` — modèle de données, endpoints, flux WhatsApp, statuts de commande.
4. `design/BRAND.md` — le guide de marque : ton, couleurs, typo, règles d'usage. Il fait foi.
5. `docs/ROADMAP.md` — l'ordre de construction, phase par phase.

## Où est le design

- `design/tokens.json` est la **source unique** des valeurs (couleurs en 2 thèmes, typo, espacements, rayons, ombres). `design/tokens.css` (variables CSS + `@font-face`) et `design/tailwind-theme.css` (thème Tailwind v4) en sont dérivés.
- `design/screens/*.dc.html` est la **maquette de référence de chaque écran**. Ce sont des fichiers d'un outil de design : `<x-import component-from-global-scope="ShiftCart.X" prop="…">` = le composant `X` avec ces props ; `{{nom}}` = une valeur calculée dans `renderVals()` en bas du fichier ; `<sc-for>` = une boucle ; `<sc-if>` = une condition. Lis-les pour la structure, les textes exacts, les espacements et les tokens utilisés. Ne les copie pas tels quels dans l'app.
- `design/components-reference/` contient l'implémentation de référence des composants (React sans JSX, `window.ShiftCart`), leurs règles (`<Composant>/README.md`), leurs props (`index.d.ts`) et leur CSS (`bundle.css`). **Réécris-les proprement** en composants Next.js (TSX + Tailwind) et Angular (standalone + Tailwind) en gardant les mêmes noms, props, états, textes et classes visuelles.
- `design/logos/` : logos fournis (PNG transparents). **Ne jamais redessiner le logo.**
- Maquettes en ligne : canvas https://claude.ai/artifact/8BLcnRQjn3qWuaZ2ArZzrc · design system https://claude.ai/artifact/FAe8h8xVbqsZo5geVJr1ta

## Règles non négociables

- **Aucune couleur, taille ou rayon en dur.** Toujours les utilitaires du thème (`bg-surface`, `text-ink`, `bg-orange text-on-orange`, `rounded-lg`, `shadow-card`, `text-display-xl`…) ou `var(--token)`.
- **Texte sur orange = `text-on-orange` (noir).** Jamais de blanc sur `#FF5A00` (contraste 3,1:1). Orange en texte sur fond clair = `text-orange-ink`.
- **Une seule action orange par écran.**
- **Statuts toujours mot + icône + couleur**, jamais la couleur seule.
- **Copie en français, tutoiement**, textes exacts des maquettes. CTA en capitales : « OBTENIR MON PACK », « CONFIRMER MA COMMANDE 🚀 ».
- **Checkout : 3 champs seulement** (nom & prénom, téléphone +216 sur 8 chiffres, gouvernorat parmi les 24). Pas de compte, pas de page panier, pas de paiement en ligne.
- **Mobile-first.** Vues client contraintes à 480px de large ; admin desktop pleine largeur (et vue mobile équipe).
- **Performance 3G** : landing < 1 s sur 4G moyen, JS client minimal, polices locales en WOFF2 (`design/fonts`), icônes Lucide, vidéo UGC en `preload="none"` + poster WebP, images `next/image`.
- **Accessibilité** : vrais `<button>`, `<a>`, `<label>` ; focus visible (`outline: 2px solid var(--focus-ring)`, décalage 2px) ; cibles ≥ 44px ; champs ≥ 16px de texte ; `prefers-reduced-motion` respecté.
- **Pas de faux avis ni de faux chiffres en production.** Les avis et les données « démo » des maquettes sont des placeholders.
- **Données personnelles** : le téléphone client n'apparaît jamais dans les logs ni les URLs publiques.

## Façon de travailler

- Une phase de `docs/ROADMAP.md` à la fois ; propose un plan court avant une phase, puis code.
- Avant d'écrire un composant, ouvre son `design/components-reference/<Nom>/README.md` et l'écran `.dc.html` qui l'utilise.
- Après chaque écran : lance lint + typecheck + tests de l'app concernée, et compare visuellement à la maquette (mêmes textes, mêmes tokens, même ordre de sections).
- Si une info manque (numéro WhatsApp, tarif transporteur, coûts…), utilise une variable d'environnement ou un placeholder `[À DÉFINIR]` et signale-le. N'invente rien.
- Commits petits et en anglais (`feat(shop): savings calculator`).
