package com.shiftcart.common.phone;

/**
 * Téléphones tunisiens : validation (messages exacts de docs/API.md), normalisation E.164,
 * affichage admin et masquage pour les logs.
 *
 * <p>Référence : {@code validateTnPhone} / {@code formatTnPhone} dans design/components-reference/bundle.js.
 */
public final class TnPhone {

    public static final String MSG_EMPTY = "Ton numéro nous sert à confirmer la commande sur WhatsApp.";
    public static final String MSG_FIRST_DIGIT = "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.";
    /** Plus de 8 chiffres : la boutique tronque à 8, ce cas ne vient que d'un appel direct à l'API. */
    public static final String MSG_TOO_LONG = "Un numéro tunisien compte 8 chiffres (sans le +216).";
    private static final String VALID_FIRST_DIGITS = "234579";

    private TnPhone() {}

    /** Garde uniquement les chiffres ("98 765 432" → "98765432"). */
    public static String digits(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replaceAll("\\D", "");
    }

    /** Message d'erreur exact, ou {@code null} si le numéro (8 chiffres locaux) est valide. */
    public static String validate(String raw) {
        String d = digits(raw);
        if (d.isEmpty()) {
            return MSG_EMPTY;
        }
        if (d.length() < 8) {
            int missing = 8 - d.length();
            return "Il manque " + missing + " chiffre" + (missing > 1 ? "s" : "") + " (8 au total).";
        }
        if (d.length() > 8) {
            return MSG_TOO_LONG;
        }
        if (VALID_FIRST_DIGITS.indexOf(d.charAt(0)) < 0) {
            return MSG_FIRST_DIGIT;
        }
        return null;
    }

    /** "98765432" → "+21698765432". Suppose un numéro déjà validé. */
    public static String toE164(String raw) {
        return "+216" + digits(raw);
    }

    /**
     * Normalise un numéro reçu de WhatsApp ("21698765432") ou saisi ("+216 98 765 432", "98765432") en E.164,
     * {@code null} si ce n'est pas un numéro tunisien.
     */
    public static String normalizeAnyToE164(String raw) {
        String d = digits(raw);
        if (d.startsWith("00216")) {
            d = d.substring(2);
        }
        if (d.length() == 11 && d.startsWith("216")) {
            return "+" + d;
        }
        if (d.length() == 8) {
            return "+216" + d;
        }
        return null;
    }

    /** "+21698765432" → "+216 98 765 432" (affichage admin et écran de confirmation). */
    public static String display(String e164) {
        String local = local(e164);
        if (local.length() != 8) {
            return e164;
        }
        return "+216 " + local.substring(0, 2) + " " + local.substring(2, 5) + " " + local.substring(5);
    }

    /** "+21698765432" → "+216 98 ••• 432" : seule forme autorisée dans les logs. */
    public static String mask(String phone) {
        String local = local(phone);
        if (local.length() != 8) {
            return "+216 •• ••• •••";
        }
        return "+216 " + local.substring(0, 2) + " ••• " + local.substring(5);
    }

    /** Les 8 chiffres locaux. */
    public static String local(String phone) {
        String d = digits(phone);
        if (d.length() == 11 && d.startsWith("216")) {
            return d.substring(3);
        }
        return d;
    }

    /** Pour wa.me et l'API WhatsApp : "+21698765432" → "21698765432". */
    public static String waId(String e164) {
        return digits(e164);
    }
}
