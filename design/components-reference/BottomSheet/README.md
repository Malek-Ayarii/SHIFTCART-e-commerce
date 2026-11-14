# BottomSheet

Tiroir modal qui monte du bas sans quitter la page : poignée, titre Syne, bouton fermer, voile `scrim`.

**Props :** `open`, `onClose`, `title`, `subtitle`, `children`, `contained` (true : positionné dans le parent relatif, ex. `MobileFrame` ; false : plein écran).

Comportement : focus sur le premier champ à l'ouverture, Tab piégé dans le tiroir, Échap et tap sur le voile ferment, focus rendu au bouton d'origine. Animation 280ms, coupée si `prefers-reduced-motion`.
