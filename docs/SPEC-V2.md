# Spécification v2 — catalogue multi-packs + refonte UX

Complète `docs/SPEC.md` (qui reste valable pour le checkout, la confirmation, le suivi et le back-office existant). Les formes JSON sont dans `docs/CONTRACT.md` › **v2**.

## Les packs (contenu fourni par la marque — textes à reprendre tels quels)

| # | Pack (slug / SKU) | Cible | Promesse | Contenu | Prix | Photo |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Le Pack Barista** (`pack-barista` / `PACK-BARISTA`) — produit phare, badge « Best-seller » | Étudiants, jeunes actifs, employés de bureau (amateurs de café). | « Ton café de pro partout avec toi. Rentabilisé en 20 jours. » | **Cafetière italienne (Moka)** — design premium en acier inoxydable noir mat. · **Thermos intelligent** — affichage LED tactile de la température sur le bouchon pour garder le café brûlant. · **Café local de spécialité 250 g** — torréfaction artisanale (le petit plus, « Offert »). | 89 TND | `pack-barista.png` |
| 2 | **Le Pack Setup & Productivité** (`pack-setup-productivite` / `PACK-SETUP`) | Développeurs, designers, ingénieurs et employés passant +8 h par jour sur un ordinateur. | « Code et révise confortablement, sans te ruiner les yeux ni le dos. » | **Support d'ordinateur pliable** — en aluminium, ergonomique pour surélever l'écran et soulager les cervicales. · **Lampe LED d'écran** — à clipser sur le haut de l'écran pour éclairer le clavier sans reflet (idéal pour le soir). · **Lunettes anti-lumière bleue** — monture minimaliste (métal noir ou écailles) pour réduire la fatigue oculaire et les maux de tête. | 79 TND (fourchette fournie 79–89 : valeur basse, modifiable) | `pack-setup-productivite.png` — **image générée par IA** (mise en scène des 3 pièces), à remplacer par une vraie photo du pack avant la mise en ligne |
| 3 | **Le Pack Espace Autonome** (`pack-espace-autonome` / `PACK-ESPACE`) | Étudiants en foyer/colocation ou employés en open space sans accès facile à une cuisine. | « Un espace 100% autonome, organisé et optimisé, même dans 9m². » | **Mini-bouilloire de voyage** — pliable en silicone, gain de place absolu (se range dans un tiroir). · **Multiprise « Cube » design** — ultra-compacte avec prises secteur et ports USB/Type-C pour charger PC, téléphone et écouteurs. · **Organisateur de bureau** — pot multifonction moderne pour les câbles et stylos. | 79 TND | `pack-espace-autonome.png` |
| 4 | **Le Pack Meal Prep** (`pack-meal-prep` / `PACK-MEALPREP`) | Étudiants et salariés qui veulent arrêter la malbouffe à midi et faire des économies. | « Mange chaud et sain au bureau ou à la fac, et économise plus de 200 TND par mois. » | **Lunchbox chauffante électrique** — se branche sur secteur pour réchauffer le repas en 30 minutes (cuve amovible en acier inoxydable, lavage facile sans odeurs). · **Grande gourde isotherme** — 1 L en acier inoxydable. · **Set de couverts nomades** — en inox (fourchette, couteau, cuillère) rangés dans un étui de transport compact. | **99 TND** (prix MVP provisoire choisi par la marque, migration `V4`) — actif ; modifiable dans l'admin | `pack-meal-prep.png` |

Points d'intérêt (hotspots) pré-placés sur les photos fournies (x %, y % depuis le coin haut-gauche) :
- Barista : café 63/68 · Moka 72/76 · thermos 84/66.
- Espace Autonome : bouilloire 33/63 · multiprise cube 42/74 · organisateur 57/52.
- Meal Prep : lunchbox 48/68 · gourde 65/50 · couverts 65/84.

Calculateur d'économies : configurable par pack. Barista = calculateur actuel (4–10 DT/jour, coût maison 0,5, 30 jours). Meal Prep = « Combien tu dépenses à midi ? » 6–20 DT/jour, pas 1, valeur initiale 10, coût maison 3 DT/jour, 22 jours ouvrés. Les autres : désactivé.

## Boutique (apps/shop)

Référence de style : tokens, composants et ton des maquettes `design/screens/` + `design/BRAND.md`. Niveau visé : les meilleures boutiques D2C (photographie produit généreuse, typographie éditoriale, micro-interactions sobres, réassurance limpide), en restant **mobile-first**, rapide en 3G et accessible.

### `/` — Accueil catalogue (statique + revalidation 60 s)
1. Navbar collante (menu · logo · bouton WhatsApp ou accès rapide aux packs ; plus de pastille panier puisqu'il n'y a pas de panier sur l'accueil).
2. **Hero éditorial** sur le pack phare : grande photo plein cadre (next/image `priority`), titre `display` en capitales façon « BOOSTE TA ROUTINE, SAUVE TON BUDGET », promesse, prix, CTA unique orange vers la page du pack phare, puces « Livraison gratuite · Paiement à la livraison ».
3. Bandeau de garanties (livraison gratuite, paiement en espèces, 24–48 h partout, confirmation WhatsApp).
4. **Collection « Choisis ta routine »** : cartes packs (photo 4:5 ou 16:10 avec zoom doux au survol, badge, nom, promesse, cible courte, prix, lien « Découvrir »). Les packs sans photo ont un visuel de secours aux couleurs de la marque (pas une image cassée).
5. Comment ça marche (3 étapes) · avis (placeholder JSON, voir règles) · CTA final · footer (liens, WhatsApp +216 92 184 592).

### `/packs/[slug]` — Page produit (statique + revalidation 60 s, `generateStaticParams`)
- **Galerie immersive** : photo principale + galerie ; mobile = carrousel scroll-snap plein largeur avec indicateurs et compteur ; desktop ≥ 1024 = grande image + vignettes, **zoom** (lightbox plein écran au clic, Échap, flèches, swipe). `prefers-reduced-motion` respecté.
- **« Qu'y a-t-il dans ton pack ? » interactif** : la photo principale avec des **pastilles numérotées** aux positions des hotspots ; tap/focus sur une pastille → carte du produit (photo du produit si fournie, sinon zoom de la photo principale centré sur le hotspot, nom, description, puce « Offert » si cadeau). Liste des produits synchronisée (survol d'une ligne ↔ pastille active). Accessible au clavier.
- **Buy box** : nom (`display-lg`), promesse, prix `text-price` + « Livraison gratuite » + « Paiement à la livraison », CTA géant **OBTENIR MON PACK** (ouvre le checkout de ce pack), réassurance « Pas de carte · Tu paies en espèces à la réception », disponibilité (« En stock — expédié sous 24 h » si packs complets ou assemblables > 0, sinon « Sur commande — 48–72 h »). Desktop : colonne collante à droite de la galerie. Mobile : StickyCta quand le CTA sort de l'écran.
- « Pour qui ? » (cible) · calculateur si configuré · comment ça marche · FAQ courte en `<details>` (livraison, paiement, retours → page Livraison & retours) · avis · **« Complète ta routine »** (autres packs actifs).
- Données structurées `Product` (JSON-LD : nom, image, prix TND, disponibilité) + métadonnées OG avec la photo.
- Checkout (tiroir mobile / fenêtre desktop) identique à la v1 mais **pour le pack affiché** (`productSku`, nom, prix et vignette dans le récap).
- Pack inactif ou inconnu → 404.

### Ajustements globaux UI & typographie
- Revoir l'échelle typographique pour un rendu plus éditorial : titres `display` plus amples sur desktop (clamp fluide), interlignage et interlettrage soignés, largeur de lecture ~60–70 caractères, hiérarchie claire (sur-titre `label` → titre → texte). Les nouvelles valeurs vont dans `design/tokens.json` **et** `design/tokens.css` / `design/tailwind-theme.css` (garder les noms d'utilitaires existants, en ajouter si besoin : p. ex. `text-display-2xl`, `text-lead`).
- Espacements plus généreux entre sections sur desktop, grilles alignées, photos à bords `rounded-lg`, ombres sobres.
- Menu (A2) : liste des packs avec vignettes + liens Suivre ma commande / WhatsApp.
- `/merci/[ref]` et `/suivi/[ref]` : afficher la vignette du pack commandé.

## Back-office (apps/admin)

Nouvel onglet **Packs** dans la barre latérale (entre Commandes et Messages IA).

### `/packs` — Catalogue
Grille de cartes : photo principale (ou visuel de secours), nom, prix, statut **Actif / Brouillon** (mot + icône + couleur), packs complets en stock, commandes du mois. Bouton « Nouveau pack ». Ordre d'affichage modifiable (glisser-déposer → `sortOrder`).

### `/packs/new` et `/packs/:id` — Éditeur de pack
- Infos : nom, slug (généré depuis le nom, modifiable), SKU, badge, promesse, cible, description, prix TND, actif (interdit si prix ≤ 0, message clair), calculateur d'économies (on/off + paramètres).
- **Photo principale** : zone de dépôt (glisser un fichier ou cliquer), aperçu, remplacer, retirer. JPEG/PNG/WebP ≤ 8 Mo, barre de progression, message d'erreur clair.
- **Galerie** : ajout multiple, réordonner par glisser-déposer, retirer, texte alternatif par photo.
- **Composition** : liste des produits du pack (choisir une pièce existante ou en créer une nouvelle inline) avec quantité, « Offert », description, **photo du produit** (dépôt comme ci-dessus).
- **Éditeur de points d'intérêt** : la photo principale affichée ; sélectionner un produit puis cliquer sur la photo pour placer sa pastille (x/y en %), déplacer en glissant, retirer. Aperçu identique au rendu boutique.
- Aperçu « carte boutique » en direct. Lien « Voir sur la boutique » (`SHOP_PUBLIC_URL/packs/<slug>`). Enregistrer / annuler, garde-fou si modifications non enregistrées.

### Écrans existants à adapter
- **Stock & marges** : par pack (packs complets, assemblables, seuil, marge) + tableau des pièces (avec vignette, packs qui l'utilisent, créer / modifier / supprimer une pièce, photo). Alerte si un pack actif a moins de 5 packs complets.
- **Commandes / Kanban / détail** : nom + vignette du pack sur les cartes et le détail ; filtre par pack sur le tableau de bord.
- **Finances** : ajout d'un tableau « Par pack » (commandes, livrées, CA encaissé).
- Polish général UI (mêmes principes que la boutique), thème sombre OK.

## Checkout v2 — adresse exacte (obligatoire)

Le formulaire de checkout (tiroir mobile et fenêtre desktop) a désormais **4 champs**, dans cet ordre : Nom & prénom · Numéro de téléphone · Ville / Gouvernorat · **Adresse exacte**.
- Champ `<textarea>` 2 lignes (auto-agrandi), label « Adresse exacte », aide « Rue, n°, quartier, ville — et un repère si besoin », placeholder « 12 rue de Marseille, cité El Khadra, Tunis (près de la pharmacie) », `autocomplete="street-address"`, texte ≥ 16px.
- Validation (identique front et back) : 10 à 200 caractères après trim. Vide : « Ton adresse permet au livreur de te trouver. » · trop courte : « Précise ta rue, ton quartier et ta ville. »
- Bandeau d'erreurs : « N infos à corriger avant de valider » compte aussi ce champ.
- Récap `/merci/[ref]` : afficher « Livraison à {gouvernorat} » (pas l'adresse complète) ; le suivi public n'affiche jamais l'adresse.
- Admin : adresse affichée dans la carte Client du détail commande (bouton « Copier l'adresse » + lien « Ouvrir dans Maps » `https://www.google.com/maps/search/?api=1&query=…`), sur le bon de livraison PDF, et incluse dans la recherche `q`.
