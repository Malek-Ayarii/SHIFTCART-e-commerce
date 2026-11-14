---
description: Vérifier un écran implémenté contre sa maquette et les règles de marque
---

Vérifie l'écran « $ARGUMENTS » sans rien modifier, puis propose les corrections.

- Comparer avec `design/screens/<fichier>.dc.html` et `docs/SPEC.md` : sections présentes et dans l'ordre, textes identiques, composants utilisés.
- Chercher les valeurs en dur (hex, px de couleurs/rayons/ombres, polices) au lieu des tokens.
- Règles `CLAUDE.md` : une seule action orange, texte noir sur orange, statuts mot + icône, checkout à 3 champs, tutoiement.
- Accessibilité : labels, focus visible, cibles ≥ 44px, contrastes en thème clair et sombre.
- Performance (boutique) : composants client inutiles, images sans `next/image`, polices non préchargées.

Rends une liste courte : problème, fichier:ligne, correction proposée.
