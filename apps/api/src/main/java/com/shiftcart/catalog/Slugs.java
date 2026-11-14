package com.shiftcart.catalog;

import java.text.Normalizer;
import java.util.Locale;

/** Liens de packs : minuscules, sans accents, mots séparés par des tirets ({@code pack-setup-productivite}). */
public final class Slugs {

    public static final int MAX = 80;

    private Slugs() {}

    public static String slugify(String value) {
        if (value == null) {
            return "";
        }
        String s = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        s = s.replace("&", " ").replace("œ", "oe").replace("Œ", "oe").replace("æ", "ae").replace("Æ", "ae")
                .replace("ß", "ss");
        s = s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
        if (s.length() > MAX) {
            s = s.substring(0, MAX).replaceAll("-+$", "");
        }
        return s;
    }

    /** SKU par défaut : {@code PACK-<SLUG>} (sans répéter « pack- » s'il ouvre déjà le lien). */
    public static String skuFor(String slug) {
        String core = slug.startsWith("pack-") ? slug.substring(5) : slug;
        String sku = ("PACK-" + core.toUpperCase(Locale.ROOT));
        return sku.length() > 64 ? sku.substring(0, 64).replaceAll("-+$", "") : sku;
    }
}
