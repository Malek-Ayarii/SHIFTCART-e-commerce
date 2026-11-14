# CheckoutForm

Le checkout express à 3 champs (nom, téléphone, gouvernorat) + récap du pack + CTA « Confirmer ma commande 🚀 » + mention COD, puis l'écran de confirmation WhatsApp.

**Props :** `price` (89), `productName`, `onSubmit(order)` → `{ id, name, phone: "+216…", city, amount, product, status: "new" }` (à poster au webhook), `whatsappNumber` (numéro de la boutique au format international, ex. `216XXXXXXXX` ; affiche le bouton « Ouvrir WhatsApp »), `onClose`.

- Le bouton reste cliquable : au clic, toutes les erreurs s'affichent et le focus va au premier champ à corriger.
- Aucune création de compte, aucun champ facultatif.
- Le message pré-rempli vient de `ShiftCart.utils.buildWhatsAppMessage(order)`.
