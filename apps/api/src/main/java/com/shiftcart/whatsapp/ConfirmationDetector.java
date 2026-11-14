package com.shiftcart.whatsapp;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reconnaît une réponse de confirmation ("oui", "OUI 👍", "ok", "نعم", "ey", "d'accord", "yes",
 * "Je confirme ma commande SC-2951"…). Une négation ("non", "pas", "annule"…) l'emporte toujours.
 */
public final class ConfirmationDetector {

    private static final Set<String> YES_WORDS = Set.of(
            "oui", "ouii", "ouiii", "wi", "ok", "okay", "okey", "oki", "dacc", "dac", "daccord", "yes", "yep", "yeah",
            "confirme", "confirmer", "confirmee", "confirm", "confirmed", "ey", "eyh", "eyy", "aye", "ay", "ih",
            "iyeh", "naam", "نعم", "اي", "ايه", "إيه", "أيه", "باهي", "مريقل", "واخا", "👍", "✅", "👌");

    private static final Set<String> NEGATIONS = Set.of(
            "non", "no", "nope", "pas", "annule", "annuler", "annulee", "stop", "cancel", "لا");

    private static final Pattern REF = Pattern.compile("SC-?(\\d{3,})", Pattern.CASE_INSENSITIVE);

    private ConfirmationDetector() {}

    public static boolean isConfirmation(String text) {
        String norm = normalize(text);
        if (norm.isEmpty()) {
            return false;
        }
        String[] tokens = norm.split(" ");
        for (String t : tokens) {
            if (NEGATIONS.contains(t)) {
                return false;
            }
        }
        if (YES_WORDS.contains(norm) || YES_WORDS.contains(tokens[0])) {
            return true;
        }
        // "je confirme…", "c'est ok", "oui merci" en fin de phrase…
        if (norm.startsWith("je confirme") || norm.startsWith("c est ok") || norm.startsWith("c est bon")) {
            return true;
        }
        return tokens.length <= 4 && java.util.Arrays.stream(tokens).anyMatch(YES_WORDS::contains);
    }

    /** "Je confirme ma commande SC-2951" → "SC-2951", sinon {@code null}. */
    public static String extractRef(String text) {
        if (text == null) {
            return null;
        }
        Matcher m = REF.matcher(text);
        return m.find() ? "SC-" + m.group(1) : null;
    }

    /** Minuscules, sans accents latins, ponctuation → espaces ; les emojis 👍✅👌 sont gardés comme mots. */
    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String t = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        t = t.toLowerCase(Locale.ROOT)
                .replace("👍", " 👍 ").replace("✅", " ✅ ").replace("👌", " 👌 ")
                .replace("'", " ").replace("’", " ");
        StringBuilder sb = new StringBuilder(t.length());
        t.codePoints().forEach(cp -> {
            if (Character.isLetterOrDigit(cp) || cp == ' ' || cp == 0x1F44D || cp == 0x2705 || cp == 0x1F44C) {
                sb.appendCodePoint(cp);
            } else {
                sb.append(' ');
            }
        });
        String collapsed = sb.toString().trim().replaceAll("\\s+", " ");
        // "d accord" → "daccord", "d acc" → "dacc"
        return collapsed.replaceAll("\\bd (accord|acc|ac)\\b", "d$1");
    }
}
