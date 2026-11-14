# Maquettes des écrans

| Fichier | Écran | App | Spec |
| --- | --- | --- | --- |
| `Main.dc.html` | Landing mobile | shop | SPEC A1 |
| `Menu.dc.html` | Menu ouvert | shop | A2 |
| `Checkout.dc.html` | Checkout, tiroir ouvert | shop | A3 |
| `CheckoutErreurs.dc.html` | Checkout avec erreurs | shop | A4 |
| `CheckoutPret.dc.html` | Checkout prêt à valider | shop | A5 |
| `Confirmation.dc.html` | Commande confirmée | shop | A6 |
| `Suivi.dc.html` | Suivi de commande | shop | A7 |
| `WebLanding.dc.html` | Landing desktop | shop | B1 |
| `AdminDashboard.dc.html` | Tableau de bord + Kanban | admin | C1 |
| `AdminCommande.dc.html` | Commande + message WhatsApp IA | admin | C2 |
| `AdminFinances.dc.html` | Finances + gouvernorats | admin | C3 |
| `AdminStock.dc.html` | Stock + marges | admin | C4 |
| `AdminMobile.dc.html` | Commandes, vue mobile équipe | admin | C5 |

Format : fichiers de l'outil de design de Claude (ils ne s'ouvrent pas seuls dans un navigateur ; voir les rendus sur https://claude.ai/artifact/8BLcnRQjn3qWuaZ2ArZzrc).
- `<x-import component-from-global-scope="ShiftCart.Button" variant="primary">…</x-import>` = composant `Button` de `../components-reference/` avec ces props (kebab-case → camelCase).
- `{{nom}}` = valeur renvoyée par `renderVals()` dans le `<script>` en bas du fichier (données d'exemple, handlers).
- `<sc-for list=… as=…>` = boucle ; `<sc-if value=…>` = condition.
- `/_blob/…` = images du logo : utiliser les fichiers de `../logos/` (`831dc0…` = shiftcart-mark.png, `90f38a…` = shiftcart-wordmark.png, `5ecef9…` = shiftcart-logo.png).
- `style="…"` en ligne utilise les variables de `../tokens.css` : à traduire en utilitaires Tailwind du thème.
