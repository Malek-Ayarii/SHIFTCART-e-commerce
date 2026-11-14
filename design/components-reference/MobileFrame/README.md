# MobileFrame

Le conteneur qui contraint les vues client à 480px, centré, avec `shadow-phone`, pour simuler un smartphone sur desktop.

**Props :** `height` (px ; défaut auto), `children`. Mets le contenu défilant dans un `div.sc-frame__scroll` ; `BottomSheet` et `StickyCta` se positionnent dans le cadre.

En production (Next.js), le cadre devient simplement `max-width: 480px; margin: 0 auto`.
