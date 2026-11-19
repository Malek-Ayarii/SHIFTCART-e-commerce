package com.nexoshift.order;

import java.util.Locale;

/** Transporteurs : code en base ({@code YALIDINE}) et libellé affiché ({@code Yalidine}). */
public final class Carriers {

    public static final String DEFAULT = "YALIDINE";

    private Carriers() {}

    public static String display(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        String lower = code.trim().toLowerCase(Locale.ROOT).replace('_', ' ');
        StringBuilder sb = new StringBuilder(lower.length());
        boolean upperNext = true;
        for (char c : lower.toCharArray()) {
            sb.append(upperNext ? Character.toUpperCase(c) : c);
            upperNext = c == ' ' || c == '-';
        }
        return sb.toString();
    }

    /** Normalise un code saisi ("Bosta" → "BOSTA"), {@code null} si vide. */
    public static String normalize(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }
        return code.trim().toUpperCase(Locale.ROOT).replaceAll("[\\s-]+", "_");
    }
}
