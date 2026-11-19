---
description: Implémenter un écran NEXO SHIFT d'après sa maquette (ex. /ecran Suivi)
---

Implémente l'écran « $ARGUMENTS ».

1. Trouve sa section dans `docs/SPEC.md` et sa maquette dans `design/screens/` (nom de fichier `.dc.html` indiqué dans la spec).
2. Lis la maquette : structure, ordre des sections, textes exacts, tokens utilisés. Rappel : `<x-import component-from-global-scope="NexoShift.X">` = composant `X` ; `{{nom}}` = valeur de `renderVals()` en bas du fichier.
3. Pour chaque composant utilisé, lis `design/components-reference/<Nom>/README.md` et réutilise le composant déjà implémenté dans l'app (crée-le s'il manque, avec les mêmes props).
4. Code l'écran dans la bonne app (`apps/shop` ou `apps/admin`), avec les utilitaires Tailwind du thème uniquement (aucune valeur en dur).
5. Branche les données sur les endpoints de `docs/API.md` ; sinon données locales clairement marquées `// TODO API`.
6. Gère chargement, vide, erreur, clavier et `prefers-reduced-motion`.
7. Lance lint, typecheck et tests de l'app, puis liste les écarts restants avec la maquette.
