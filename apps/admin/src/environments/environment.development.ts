/**
 * Environnement de développement (remplace environment.ts via fileReplacements).
 * L'API (profil Spring `dev`) charge des données de démo : badge « Données de démo » affiché.
 * Garder les mêmes clés que environment.ts.
 */
export const environment = {
  production: false,
  apiUrl: '',
  /** Numéro WhatsApp de l'agent stock, format international sans + (ex. 216XXXXXXXX). [À DÉFINIR] */
  agentWhatsappNumber: '',
  demoDataBadge: true,
  pollIntervalMs: 30_000,
};
