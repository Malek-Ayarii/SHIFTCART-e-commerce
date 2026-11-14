# StoryVideo

Emplacement vidéo UGC au format Story Instagram (9:16) : barres de progression, avatar, accroche en Syne, bouton play orange.

**Props :** `src` (MP4 court, ≤ 15 s, ≤ 1,5 Mo), `poster` (image WebP légère, indispensable en 3G), `caption`, `author`, `handle`, `index` (barre active).

La vidéo est `muted`, `playsInline`, `preload="none"` : rien ne se télécharge avant le tap. Sans `src`, un placeholder rayé s'affiche.
