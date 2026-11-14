/**
 * Environnement de développement (remplace environment.ts via fileReplacements).
 * L'API (profil Spring `dev`) charge des données de démo : badge « Données de démo » affiché.
 * Garder les mêmes clés que environment.ts.
 */
export const environment = {
  production: false,
  apiUrl: '',
  /** Numéro WhatsApp de la boutique (+216 92 184 592), format international sans +. */
  shopWhatsappNumber: '21692184592',
  /** Numéro WhatsApp de l'agent stock (alerte « stock bas ») ; par défaut celui de la boutique. */
  agentWhatsappNumber: '21692184592',
  /** URL publique de la boutique (lien « Voir sur la boutique »). Vide = [À DÉFINIR] en prod. */
  shopUrl: 'http://localhost:3000',
  demoDataBadge: true,
  pollIntervalMs: 30_000,
};
