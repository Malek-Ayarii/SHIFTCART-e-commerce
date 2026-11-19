# PhoneInput

Numéro tunisien : préfixe fixe +216 (drapeau), saisie limitée à 8 chiffres et masquée en `98 765 432`.

**Props :** `value` (8 chiffres bruts, sans espaces), `onChange(digits)`, `onBlur`, `error`, `label`, `hint`.

Clavier numérique (`inputMode="numeric"`, `autoComplete="tel-national"`). Validation : `NexoShift.utils.validateTnPhone` (8 chiffres, premier chiffre 2, 3, 4, 5, 7 ou 9) ; envoie `+216` + chiffres au back-office.
