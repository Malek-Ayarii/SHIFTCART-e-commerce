package com.shiftcart.common;

import java.util.List;

/** Les 24 gouvernorats, orthographe et accents exacts (identique au front et à la contrainte SQL). */
public final class Governorates {

    public static final List<String> ALL = List.of(
            "Ariana", "Béja", "Ben Arous", "Bizerte", "Gabès", "Gafsa", "Jendouba", "Kairouan",
            "Kasserine", "Kébili", "Le Kef", "Mahdia", "La Manouba", "Médenine", "Monastir", "Nabeul",
            "Sfax", "Sidi Bouzid", "Siliana", "Sousse", "Tataouine", "Tozeur", "Tunis", "Zaghouan");

    public static final String MSG_REQUIRED = "Choisis où te livrer.";

    private Governorates() {}

    public static boolean isValid(String value) {
        return value != null && ALL.contains(value);
    }
}
