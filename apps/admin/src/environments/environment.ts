/**
 * Environnement de production. Les valeurs métier manquantes restent vides : [À DÉFINIR].
 */
export const environment = {
  production: true,
  /** Préfixe des appels API. Vide = même origine (`/api/...`), servie derrière le même domaine ou un reverse proxy. */
  apiUrl: '',
  /** Numéro WhatsApp de la boutique (+216 92 184 592), format international sans +. */
  shopWhatsappNumber: '21692184592',
  /** Numéro WhatsApp de l'agent stock (alerte « stock bas ») ; par défaut celui de la boutique. */
  agentWhatsappNumber: '21692184592',
  /** URL publique de la boutique (lien « Voir sur la boutique »). Vide = [À DÉFINIR] en prod. */
  shopUrl: '',
  /** Affiche le badge « Données de démo » sur Finances et Stock (données seedées du profil dev de l'API). */
  demoDataBadge: false,
  /** Rafraîchissement des nouvelles commandes (ms). */
  pollIntervalMs: 30_000,
};
