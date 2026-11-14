package com.shiftcart.messages;

import java.util.List;
import java.util.Map;

/**
 * Gabarits déterministes (sans LLM ou en secours) : tutoiement, 1 à 2 phrases, prénom, pack,
 * gouvernorat, montant en TND, appel à répondre « OUI ». Repris des exemples de
 * design/screens/AdminCommande.dc.html (renderVals).
 */
public final class MessageTemplates {

    private static final Map<Tone, List<String>> TEMPLATES = Map.of(
            Tone.AMICAL, List.of(
                    "Salut {prenom} ! Ton {pack} pour {gouvernorat} est prêt ({montant} TND, paiement à la livraison). "
                            + "Réponds OUI pour déclencher la livraison 🚚",
                    "Salut {prenom} ! Ton {pack} pour {gouvernorat} est prêt. {montant} TND à payer au livreur, "
                            + "livraison gratuite. Un « OUI » pour confirmer ?"),
            Tone.DIRECT, List.of(
                    "Bonjour {prenom}, commande #{numero} : {pack}, {montant} TND en espèces, livraison à {gouvernorat} "
                            + "sous 24–48 h. Réponds OUI pour confirmer.",
                    "{prenom}, ta commande #{numero} ({pack}, {montant} TND, livraison à {gouvernorat}) attend ta "
                            + "confirmation. Réponds OUI pour l’expédier."),
            Tone.RELANCE, List.of(
                    "Salut {prenom}, petit rappel : ton {pack} t’attend toujours ({montant} TND à la livraison). "
                            + "Réponds OUI et il part pour {gouvernorat} demain matin.",
                    "{prenom}, on garde ton {pack} de côté jusqu’à ce soir. Un OUI et il part pour {gouvernorat} "
                            + "({montant} TND à payer au livreur)."));

    private static final String CONFIRMATION_RECAP =
            "C’est confirmé {prenom} ✅ Ton {pack} part bientôt pour {gouvernorat}. {montant} TND à payer au livreur. "
                    + "Suis ta commande ici : {lien}";

    private MessageTemplates() {}

    public static int variantCount(Tone tone) {
        return TEMPLATES.get(tone).size();
    }

    /** Variante {@code variant} (modulo le nombre de variantes) du ton demandé. */
    public static String render(Tone tone, int variant, MessageContext ctx) {
        List<String> list = TEMPLATES.get(tone);
        return fill(list.get(Math.floorMod(variant, list.size())), ctx, null);
    }

    /** Récapitulatif envoyé quand le client a confirmé sur WhatsApp. */
    public static String confirmationRecap(MessageContext ctx, String trackingUrl) {
        return fill(CONFIRMATION_RECAP, ctx, trackingUrl);
    }

    private static String fill(String template, MessageContext ctx, String link) {
        return template
                .replace("{prenom}", ctx.firstName())
                .replace("{pack}", ctx.pack())
                .replace("{gouvernorat}", ctx.governorate())
                .replace("{montant}", ctx.amount())
                .replace("{numero}", ctx.orderNumber())
                .replace("{lien}", link == null ? "" : link);
    }
}
