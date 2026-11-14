# OrderCard

Carte de commande du Kanban : ID, nom du client, montant, ville, ancienneté et UNE action contextuelle selon le statut.

**Props :** `order` `{ id, name, amount, city, status, age?, carrier?, tracking? }`, `onAction(order, action, whatsappMessage)` avec `action` = `whatsapp` (Nouvelles) | `remind` (En attente) | `print` (Confirmées), `draggable`, `showStatus`.

Expédiées : pas de bouton, le transporteur s'affiche (Yalidine, Bosta…). Le bouton affiche un retour « fait » pendant 1,8 s.
