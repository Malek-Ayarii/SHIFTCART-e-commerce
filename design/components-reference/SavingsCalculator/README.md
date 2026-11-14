# SavingsCalculator

Slider 4–10 DT/jour qui calcule en direct l'économie mensuelle, une équivalence concrète et le nombre de jours pour rembourser le pack.

**Props :** `min` (4), `max` (10), `step` (0,5), `defaultValue`, `homeCostPerDay` (0,5 DT : coût d'un café maison), `daysPerMonth` (30), `packPrice` (89), `onChange(daily, saved)`.

Formule affichée sous le résultat : `(dépense − café maison) × jours`. Garde-la visible : un chiffre d'économie sans calcul paraît gonflé.

Bloc sur fond `ink`, résultat sur `orange` avec texte `on-orange`. Le slider est un `<input type="range">` natif (clavier et lecteurs d'écran inclus).
