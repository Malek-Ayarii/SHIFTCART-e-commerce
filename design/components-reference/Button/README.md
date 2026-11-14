# Button

Le bouton d'action ; la variante `primary` orange est réservée à UNE action par écran (acheter, confirmer).

**Props :** `variant` `primary | dark | ghost | whatsapp`, `size` `sm | md | xl`, `block` (pleine largeur), `icon` / `iconRight` (nom d'`Icon`), `href` (rend un lien), plus tous les attributs `<button>` (`type="submit"`, `onClick`…).

- `xl` = le CTA géant de la landing et du checkout : 64px de haut, capitales, ombre dure `ink` qui s'écrase au tap.
- Texte sur orange en `on-orange` (noir, 5,6:1), jamais blanc.
- Libellé verbe d'abord, à la 1re personne : « Obtenir mon pack », « Confirmer ma commande ».
- `whatsapp` uniquement pour une action qui ouvre WhatsApp.
