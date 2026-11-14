/**
 * Environnement de production. Les valeurs métier manquantes restent vides : [À DÉFINIR].
 */
export const environment = {
  production: true,
  /** Préfixe des appels API. Vide = même origine (`/api/...`), servie derrière le même domaine ou un reverse proxy. */
  apiUrl: '',
  /** Numéro WhatsApp de l'agent stock, format international sans + (ex. 216XXXXXXXX). [À DÉFINIR] */
  agentWhatsappNumber: '',
  /** Affiche le badge « Données de démo » sur Finances et Stock (données seedées du profil dev de l'API). */
  demoDataBadge: false,
  /** Rafraîchissement des nouvelles commandes (ms). */
  pollIntervalMs: 30_000,
};
