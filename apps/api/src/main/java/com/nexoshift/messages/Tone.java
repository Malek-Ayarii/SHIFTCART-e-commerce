package com.nexoshift.messages;

import java.util.Locale;
import java.util.Optional;

/** Tons du générateur (écran AdminCommande) : Amical, Direct, Relance. */
public enum Tone {
    AMICAL, DIRECT, RELANCE;

    /** Valeur JSON : "amical" | "direct" | "relance". */
    public String value() {
        return name().toLowerCase(Locale.ROOT);
    }

    public static Optional<Tone> parse(String value) {
        if (value == null) {
            return Optional.empty();
        }
        for (Tone t : values()) {
            if (t.value().equals(value.trim().toLowerCase(Locale.ROOT))) {
                return Optional.of(t);
            }
        }
        return Optional.empty();
    }
}
