# KpiCard

Indicateur clé du dashboard : libellé en capitales, valeur en Syne 32px, variation colorée.

**Props :** `label`, `value` (déjà formatée : « 12 638 TND »), `icon`, `delta`, `trend` (`up | down` : sens de la flèche), `good` (false = variation défavorable, en `danger`), `period`, `accent` (icône sur orange : réservé au premier KPI).

La couleur suit le sens métier, pas la flèche : un taux de retour qui baisse est `good`.
