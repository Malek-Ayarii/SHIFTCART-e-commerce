NEXO SHIFT vend un seul pack, à une seule cible (étudiants et jeunes actifs tunisiens, 19–30 ans), par un seul geste : un achat d'impulsion payé en espèces à la livraison, confirmé sur WhatsApp. Chaque écran sert ce geste. Le style est « hustle » : contrasté, net, énergique — fond clair, noir robuste, un orange électrique réservé à l'action.

## Contenu et ton

- **Tutoiement, toujours.** « Booste ta routine », « Finalise ta commande », « Tu paies à la livraison ».
- **Phrases courtes, verbes d'action.** Les CTA commencent par un verbe à la 1re personne du client : « Obtenir mon pack », « Confirmer ma commande 🚀 ».
- **Capitales** pour le titre hero, les CTA géants (`cta`) et les sur-titres (`label`). Phrase normale partout ailleurs.
- **L'argent en clair.** Prix toujours suivi de « TND » et des deux promesses : « Livraison gratuite » et « Paiement à la livraison ». Pas de frais cachés, pas de prix barré inventé.
- **Chiffres d'économie honnêtes.** Le calculateur affiche sa formule. Pas de statistiques sans source.
- **Avis réels uniquement.** Prénom + gouvernorat (« Yasmine · Sousse »), texte court tel qu'écrit par le client. Les avis des maquettes sont des placeholders à remplacer par de vrais avis avant la mise en ligne.
- **Emoji : avec parcimonie**, seulement dans les messages de transaction (« 🚀 » sur la confirmation, « 🚚 » dans le message WhatsApp). Jamais décoratifs dans les titres.
- Exemples de microcopie : erreur téléphone « Il manque 2 chiffres (8 au total). » ; aide « * Pas de carte, paiement en espèces. » ; WhatsApp « Salut Mohamed ! Ton Pack Barista pour Sousse est prêt. Réponds OUI pour déclencher la livraison 🚚 ».

## Couleur

- **60 / 30 / 10.** `surface` (#F8F9FA) domine, `ink` (#1A1A1A) structure (titres, blocs « hustle » : story UGC, calculateur), `orange` (#FF5A00) ne sert qu'à l'action.
- **Une seule action orange par écran** (CTA géant, CTA collant, bouton de confirmation). Les actions secondaires sont `dark` ou `ghost`.
- **Texte sur orange : `on-orange` (noir, 5,6:1).** Le blanc sur orange ne fait que 3,1:1 : interdit.
- **Orange comme texte : `orange-ink`** (#C24400 en clair, #FF8A4C en sombre). `orange` pur reste un fond ou un détail sur `ink`.
- **Statuts du pipeline** : `new` → orange, `pending` → `warning`, `confirmed` → `success`, `shipped` → `info`, `returned` → `danger`, chacun avec son fond `*-soft` et toujours un mot + une icône (jamais la couleur seule).
- Deux thèmes : **Client (clair)**, le thème par défaut du site et du dashboard ; **Hustle (sombre)** pour le mode sombre et les visuels sociaux.

## Typographie

- **Syne** (700, 800) pour l'impact : `display-xl` (titre hero, 40px, capitales), `display-lg` (nom du pack, titre du tiroir), `price`, `kpi`, `heading`.
- **Plus Jakarta Sans** (400–800) pour la lecture : `body` 16px minimum sur mobile, `body-sm` pour méta et avis, `title` pour les noms, `cta` (18px, 800, capitales) dans les gros boutons, `label` (13px, 700, capitales, interlettrage 0,06em).
- Les deux familles sont servies depuis `fonts/` (sous-ensemble latin, ~12 Ko par graisse). Charger au maximum Syne 800 + Jakarta 400/700 sur la landing pour rester sous la seconde en 3G.

## Espacement, rayons, ombres

- Grille de 4px : `space-4` (16px) de marge latérale mobile, `space-5` dans les cartes et le tiroir, `space-8` entre sections.
- Rayons francs mais doux : `radius-sm` badges, `radius-md` champs et cartes de commande, `radius-lg` cartes de section et CTA géant, `radius-sheet` pour le haut du bottom sheet, `radius-pill` pour les puces.
- Ombres sobres : `shadow-card` au repos, `shadow-lift` pour ce qui flotte (carte qu'on glisse, CTA collant), `shadow-sheet`, `shadow-phone` pour le cadre mobile. Signature : le CTA géant a une **ombre dure `ink` de 6px** qui s'écrase au tap.

## Mise en page

- **Vues client : mobile-first, 480px maximum**, centrées (`MobileFrame`). Ordre de la landing figé : promesse (hero) → preuve (story UGC) → offre (Pack Barista + prix) → argument financier (calculateur) → contenu → avis → relance. Tous les CTA ouvrent le même `BottomSheet`.
- **Checkout : 3 champs, pas de compte, pas de page panier.** Nom & prénom, téléphone `+216` sur 8 chiffres, gouvernorat (liste des 24). Le bouton de validation reste cliquable et révèle les erreurs.
- **Admin : desktop pleine largeur.** Header, 3 KPI, Kanban 4 colonnes (Nouvelles, En attente, Confirmées, Expédiées) avec une action contextuelle par carte (WhatsApp, Relancer, Imprimer, transporteur).

## Mouvement et états

- Durées courtes : 120ms (tap, survol), 220ms (CTA collant), 280ms (bottom sheet), courbe `cubic-bezier(.2,.8,.2,1)`. Tout est coupé sous `prefers-reduced-motion`.
- **Focus clavier** : anneau `focus-ring` plein de 2px, décalé de 2px — noir en clair, orange clair en sombre ; ≥ 3:1 partout.
- Erreurs : au blur, en `danger` avec une icône et une phrase qui dit quoi faire, effacées dès que la saisie est valide.
- Cibles tactiles : 44×44px minimum ; champs de 52px ; CTA géant de 64px.

## Performance (3G/4G)

- Icônes intégrées au code (aucune requête), polices en WOFF2 sous-ensemble latin, vidéo UGC en `preload="none"` avec poster WebP léger.
- Pas de carrousel, pas d'animation au chargement, pas d'image au-dessus du hero autre que le poster.

## Iconographie

- **Lucide** (licence ISC), trait 2px, coins arrondis, 24px de base — 16px dans le texte, 20–24px dans les boutons. Les tracés sont intégrés à `components/bundle.js` (`NexoShift.Icon`) et prennent `currentColor`.
- L'icône WhatsApp est la bulle de dialogue Lucide (`whatsapp`), pas le logo officiel : utiliser le logo WhatsApp suppose de suivre la charte de Meta.
- L'icône de panier de la navbar reste l'icône Lucide `cart` ; le pictogramme du logo n'est pas une icône d'interface.

## Logo

- Fichiers (SVG, source de vérité) : `apps/shop/public/logos/nexoshift-logo.svg` (logo complet), `nexoshift-horizontal.svg` (logo + baseline horizontale), `nexoshift-mark.svg` (pictogramme seul) — variantes `-light` pour fond sombre, disponibles côté apps (`apps/admin/public/assets/logos/`). Ne jamais redessiner le logo ni recomposer son texte : son lettrage n'est pas une police du système.
- Toujours utiliser ces fichiers ; ne jamais redessiner le logo ni recomposer son texte en Syne : son lettrage n'est pas une police du système.
- **Navbar mobile** : `nexoshift-mark.svg` à 32px + le `Wordmark`, ou `nexoshift-horizontal.svg` à 20–24px de haut. **Header admin** : pictogramme 36px + wordmark. **Écrans de marque** (confirmation, réseaux, emballage) : `nexoshift-logo.svg`.
- Le pictogramme et le wordmark sont en noir `ink` : uniquement sur `surface`, `surface-raised` ou `orange-soft`. Sur fond sombre ou orange, les poser dans une pastille `surface-raised` (cercle de 8px de marge).
- Zone de protection : la hauteur de l'éclair ÷ 4 tout autour. Taille minimale du pictogramme : 24px.
- `Wordmark` et `Navbar` acceptent `src` / `logoSrc` pour afficher l'image du logo ; sans image, le nom s'écrit en Syne en secours.

## Utiliser les composants

Les composants sont dans `components/bundle.js` sous `window.NexoShift` (React 18 requis sur la page) avec `components/bundle.css`. `LandingPage` assemble les vues 1 et 2, `AdminDashboard` la vue 3. Les utilitaires `NexoShift.utils` donnent la validation du numéro tunisien, le formatage `98 765 432`, la liste des gouvernorats et le message WhatsApp pré-rempli.
