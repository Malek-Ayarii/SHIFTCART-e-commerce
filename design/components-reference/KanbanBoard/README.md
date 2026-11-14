# KanbanBoard

Le pipeline COD en 4 colonnes (Nouvelles, En attente, Confirmées, Expédiées) avec glisser-déposer.

**Props :** `orders` (liste d'`OrderCard`), `lanes` (ordre des statuts ; ajoute `returned` pour une 5e colonne), `counts` (totaux serveur par statut si la liste est paginée), `onMove(id, status, orders)`, `onAction`, `title`.

Accessibilité : chaque carte est focusable ; ← et → la déplacent d'une colonne. La colonne survolée pendant un glisser passe en `orange-soft` avec un contour `orange`.
