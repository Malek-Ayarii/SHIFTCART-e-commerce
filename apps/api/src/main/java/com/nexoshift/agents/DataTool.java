package com.nexoshift.agents;

/**
 * Outils de lecture des données de la boutique proposés aux agents. Tous renvoient des agrégats (aucun nom,
 * téléphone ni adresse de client). {@code monthParam} = l'outil accepte un mois {@code AAAA-MM} optionnel.
 */
public enum DataTool {

    KPIS("get_kpis", true, "lire les indicateurs du mois",
            "Indicateurs du mois : nombre de commandes, CA commandé (TND, hors annulées), taux de retour, commandes "
                    + "à confirmer, et variations par rapport au mois précédent."),
    FINANCE("get_finance", true, "lire les finances du mois",
            "Finances du mois : CA commandé, encaissé (livré et payé), retours, en cours, frais transporteur, "
                    + "CA net, taux d'encaissement et détail par semaine."),
    DAILY("get_daily_orders", true, "lire les commandes jour par jour",
            "Commandes et CA commandé jour par jour sur le mois (heure de Tunis)."),
    GOVERNORATES("get_governorates", true, "lire la répartition par gouvernorat",
            "Commandes, livraisons, retours et encaissé par gouvernorat sur le mois, triés par volume."),
    PACKS("get_pack_performance", true, "lire la performance des packs",
            "Par pack sur le mois : commandes, livrées, retournées, CA commandé, encaissé et part des commandes."),
    STOCK("get_stock", false, "lire le stock et les marges",
            "Stock actuel : pièces (quantité, seuil, coût unitaire) et packs (packs complets, assemblables, prix, "
                    + "coût des pièces, frais transporteur, marge)."),
    CATALOG("get_catalog", false, "lire le catalogue des packs",
            "Catalogue : nom, prix, accroche, public visé, badge, statut (actif / brouillon) et contenu de chaque "
                    + "pack.");

    private final String toolName;
    private final boolean monthParam;
    private final String traceLabel;
    private final String description;

    DataTool(String toolName, boolean monthParam, String traceLabel, String description) {
        this.toolName = toolName;
        this.monthParam = monthParam;
        this.traceLabel = traceLabel;
        this.description = description;
    }

    public String toolName() {
        return toolName;
    }

    public boolean monthParam() {
        return monthParam;
    }

    /** Libellé affiché dans la trace (« a lu les indicateurs du mois »). */
    public String traceLabel() {
        return traceLabel;
    }

    public String description() {
        return description;
    }

    public static DataTool byToolName(String name) {
        for (DataTool t : values()) {
            if (t.toolName.equals(name)) {
                return t;
            }
        }
        return null;
    }
}
