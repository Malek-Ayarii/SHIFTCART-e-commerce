# Spécification des écrans

Chaque écran a une maquette de référence dans `design/screens/`. Les textes, l'ordre des sections et les tokens de la maquette font foi. Les composants cités sont décrits dans `design/components-reference/<Nom>/README.md` (props dans `index.d.ts`).

Parcours client : **Reel Instagram/TikTok → Landing → Checkout (tiroir) → Confirmation → WhatsApp « OUI » → Suivi → Livraison payée en espèces.**
Parcours équipe : **Kanban (Nouvelles → En attente → Confirmées → Expédiées) → détail commande + message IA → Finances → Stock.**

---

## A. Boutique — mobile (`apps/shop`, conteneur max 480px centré)

### A1. Landing — `/` · `Main.dc.html`
Ordre des sections (figé) :
1. **Navbar** collante 56px : menu (ouvre A2) · logo `design/logos/shiftcart-wordmark.png` 20px de haut · panier (ouvre le checkout A3) avec pastille `1`.
2. **Hero** : sur-titre `text-label` orange-ink avec icône Zap « Pour les étudiants qui bossent dur » ; titre `text-display-xl` en capitales « BOOSTE TA ROUTINE, » + « SAUVE TON BUDGET » en `orange-ink` ; **StoryVideo** 9:16 (vidéo UGC, poster, `preload="none"`, barres de story, avatar, badge UGC, bouton play orange, légende « Pourquoi j'ai arrêté de jeter 120 DT/mois »).
3. **ProductCard** « Le Pack Barista » : sur-titre Best-seller, pitch, **PriceTag** (89 TND + puces « Livraison gratuite » et « Paiement à la livraison »), CTA géant **OBTENIR MON PACK** (Button `primary` `xl`, ombre dure ink), réassurance « Pas de carte · Tu paies en espèces à la réception ».
4. **Calcule tes économies** : **SavingsCalculator** (slider 4–10 DT/jour, pas 0,5, valeur initiale 6 ; résultat = (dépense − 0,5) × 30 ; équivalence ; « Pack remboursé en N jours » ; formule affichée).
5. **Qu'y a-t-il dans ton pack ?** : **IncludedList** (Cafetière italienne Moka · Thermos intelligent LED · Café tunisien offert avec puce « Offert »). Remplacer les icônes par des photos WebP 48×48 quand elles existent.
6. **Comment ça marche** : 3 étapes numérotées (Commande en 30 secondes · Confirme sur WhatsApp · Paie à la livraison).
7. **Ils ont choisi de changer** : 3 **ReviewCard** — **à alimenter avec de vrais avis** (CMS ou JSON) ; « Achat vérifié » seulement si lié à une commande livrée.
8. **CTA final** : « 89 TND, livré chez toi. » + CTA géant + « Paiement en espèces à la livraison ».
9. **Footer** ink : pictogramme dans une pastille blanche, liens (Suivre ma commande, Livraison & retours, WhatsApp), mentions.
- **StickyCta** : apparaît en bas quand le CTA de la ProductCard sort de l'écran (IntersectionObserver), disparaît quand le tiroir est ouvert.
- Tous les CTA ouvrent **le même** tiroir de checkout (A3).
- Événements analytics : `ViewContent` au chargement, `InitiateCheckout` à l'ouverture du tiroir, `Lead` à la commande créée.

### A2. Menu ouvert · `Menu.dc.html`
Plein écran. Header (fermer · logo · panier). Liens en `font-display` 28px : Le Pack Barista (89 TND) · Calcule tes économies · Avis clients · Suivre ma commande. 3 tuiles de réassurance (Livraison gratuite, Paiement en espèces, 24–48 h partout). En bas : CTA géant + bouton ghost « Une question ? Écris-nous » (WhatsApp) + pictogramme + « E-SHOP & ROUTINE ».

### A3. Checkout — tiroir ouvert · `Checkout.dc.html`
**BottomSheet** par-dessus la landing (voile `scrim`) : poignée, titre « Finalise ta commande », sous-titre « Tu paies à la livraison », bouton fermer. Contenu = **CheckoutForm** :
- récap du pack (icône café sur ink, « Le Pack Barista », « Livraison gratuite · 24–48 h », 89 TND) ;
- **TextField** « Nom & prénom » (placeholder « Mohamed Ben Ali », `autocomplete="name"`) ;
- **PhoneInput** préfixe drapeau + « +216 », masque `98 765 432`, `inputmode="numeric"`, `autocomplete="tel-national"` ;
- **GovernorateSelect** `<select>` natif, groupe « Les plus demandés » (Tunis, Sousse, Sfax, Ariana, Ben Arous) puis les 24 ;
- CTA géant **CONFIRMER MA COMMANDE 🚀** ;
- « * Pas de carte, paiement en espèces. »
Comportement : focus sur le premier champ à l'ouverture, Tab piégé, Échap / voile = fermer, retour du focus ; validation au blur ; bouton toujours cliquable (révèle les erreurs et focus le premier champ invalide) ; pendant l'envoi : bouton désactivé + « Envoi… » ; erreur réseau : message en `danger-soft` + bouton réessayer, données conservées.

### A4. Checkout — erreurs · `CheckoutErreurs.dc.html`
Bandeau `danger-soft` « N infos à corriger avant de valider » + erreurs sous chaque champ (icône alerte, texte `danger`, bordure `danger`). Messages exacts : `docs/API.md` › Règles de validation.

### A5. Checkout — prêt à valider · `CheckoutPret.dc.html`
Champs remplis et valides (Mohamed Ben Ali · 98 765 432 · Sousse). Le CTA mène à A6.

### A6. Commande confirmée — `/merci/[ref]` · `Confirmation.dc.html`
Header logo centré · pastille succès (check 40px) · badge « Nouvelle » · titre « Commande #SC-2951 reçue 🚀 » · « Merci {prénom} ! On t'envoie un message WhatsApp au +216 98 765 432. » · 3 étapes (1 en `orange-soft` : « Réponds OUI sur WhatsApp pour confirmer. ») · récap (pack, livraison gratuite, « À payer à la livraison 89 TND ») · bouton **Ouvrir WhatsApp** (`whatsapp` `xl`, lien `wa.me` pré-rempli, voir API.md › Flux WhatsApp) · bouton ghost « Suivre ma commande ».

### A7. Suivi de commande — `/suivi/[ref]?t=…` · `Suivi.dc.html`
Sur-titre « Commande #SC-2951 », titre « Ton pack est en route », badge statut + date prévue. Timeline verticale : Commande reçue ✓ · Confirmée sur WhatsApp ✓ · Expédiée avec Yalidine (étape courante, pastille orange, n° de suivi) · Livrée & payée (à venir, grisée). Encart ink « Prépare en espèces 89 TND ». Bouton WhatsApp « Une question ? Écris-nous ». Les étapes viennent de `GET /api/orders/{ref}/tracking`.

## B. Boutique — desktop (`apps/shop`, ≥ 1024px)

### B1. Landing desktop — `/` · `WebLanding.dc.html`
Header collant (pictogramme 40px + wordmark, nav Le pack / Économies / Avis / Suivre ma commande, CTA « Obtenir mon pack · 89 TND »). Hero en 2 colonnes : texte (titre `display` 72px, pitch, PriceTag, CTA `xl` 340px, réassurance) | StoryVideo 400px avec une ReviewCard flottante. Bandeau ink de 4 garanties. Pack + calculateur côte à côte. 3 étapes en cartes (la 3e sur ink). 3 avis. Bandeau orange « 89 TND, livré chez toi. Payé à la porte. » + bouton `dark`. Footer.

### B2. Checkout desktop (à construire, pas de maquette dédiée)
Même **CheckoutForm** dans une fenêtre centrée de 480px (`rounded-sheet`, `shadow-sheet`, voile `scrim`) au lieu du tiroir. Confirmation et suivi : mêmes contenus que A6/A7 dans une colonne centrée de 560px.

## C. Back-office (`apps/admin`)

Gabarit commun : barre latérale 240px (pictogramme + wordmark ; liens Commandes, Messages IA, Finances, Stock & marges — lien actif sur fond ink ; alerte stock en `warning-soft` ; avatar agent) + contenu fluide. Sous 768px la barre passe en haut / en barre d'onglets.

### C1. Tableau de bord — `/` · `AdminDashboard.dc.html`
Titre « Tableau de bord » + « Novembre 2026 · pipeline COD » · recherche (#ref, nom, téléphone) · sélecteur de mois. 4 **KpiCard** : Commandes 142 (+18 %, icône sur orange) · Chiffre d'affaires 12 638 TND (+11 %) · Taux de retour 8 % (−2 pts, en vert car favorable) · À confirmer 22. **KanbanBoard** 4 colonnes (Nouvelles, En attente, Confirmées, Expédiées) avec compteurs serveur, cartes **OrderCard** (ID, nom, montant, ville, ancienneté, action contextuelle), glisser-déposer + ← → au clavier, colonne survolée en `orange-soft` avec contour orange. Déplacer une carte = `PATCH /status` (optimiste, rollback + message en cas d'erreur). Clic sur une carte → C2.

### C2. Commande & message IA — `/commandes/:id` · `AdminCommande.dc.html`
Fil d'Ariane · « #2948 · Mohamed Ben Ali » + badge + ancienneté · actions Annuler (ghost) / Marquer confirmée (dark). Colonne gauche : carte Client (nom, téléphone, gouvernorat, source de la commande), carte Commande (pack, pièces, montant, paiement, transporteur). Colonne droite (bloc ink) : **Message WhatsApp IA** — choix du ton (Amical · Direct · Relance), textarea modifiable, Régénérer · Copier · **Envoyer sur WhatsApp**. Ajouter sous la carte Commande l'historique `order_event` et les messages échangés.

### C3. Finances — `/finances` · `AdminFinances.dc.html`
4 KPI (CA commandé, CA encaissé, taux d'encaissement, frais transporteur) · graphique barres par semaine commandé (ink) vs encaissé (orange) avec légende texte · bloc ink « Du commandé au réel » (commandé − retours − en cours − frais = net) · tableau par gouvernorat (part en barre, commandes, livrées, retours, CA encaissé ; Tunis et Sousse mis en avant). Les chiffres des maquettes sont **des données de démo**.

### C4. Stock & marges — `/stock` · `AdminStock.dc.html`
Alerte `warning-soft` « Plus que N packs complets en stock (seuil : 5) » + packs assemblables + actions « Alerter l'agent » (WhatsApp) / « Assembler N packs ». Tableau des pièces (coût, stock, seuil, état OK / À réassortir). Bloc ink « Marge par pack » : prix − COGS − livraison offerte = marge brute + jauge %. Coûts des maquettes = **démo**, à remplacer.

### C5. Équipe — commandes mobile · `AdminMobile.dc.html`
Vue téléphone de l'agent : header (pictogramme, « Commandes », total, avatar) · 3 mini-KPI (CA, à confirmer, retours) · filtres en pastilles par statut avec compteurs · liste d'OrderCard avec badge statut · barre d'onglets (Commandes, Messages, Finances, Stock).

---

## États à prévoir partout

- **Chargement** : squelettes aux dimensions finales (pas de spinner plein écran), rien sous 100 ms.
- **Vide** : colonne Kanban « Dépose une commande ici » ; liste sans commande avec phrase + action.
- **Erreur** : phrase qui dit quoi faire + bouton réessayer, sans perdre la saisie.
- **Thème sombre** : toutes les couleurs passent par les tokens, donc `data-theme="dark"` suffit (admin surtout).
