package com.shiftcart.common.money;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/**
 * Montants : millimes ({@code long}) en base, TND ({@link BigDecimal}) en JSON.
 *
 * <p>Les valeurs TND renvoyées sont "nettoyées" ({@code stripTrailingZeros}) et, avec
 * {@code spring.jackson.generator.write-bigdecimal-as-plain=true}, sérialisées en nombres simples :
 * {@code 89} et non {@code 89.000}, {@code 12638.5} et non {@code 12638.500}.
 */
public final class Money {

    public static final long MILLIMES_PER_TND = 1000L;

    private Money() {}

    /** Millimes → TND (nombre JSON propre). */
    public static BigDecimal toTnd(long millimes) {
        return clean(BigDecimal.valueOf(millimes).movePointLeft(3));
    }

    /** TND → millimes (arrondi au millime le plus proche). */
    public static long toMillimes(BigDecimal tnd) {
        return tnd.movePointRight(3).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    /** Supprime les zéros inutiles tout en restant en notation simple (0 reste 0). */
    public static BigDecimal clean(BigDecimal value) {
        if (value == null) {
            return null;
        }
        if (value.signum() == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal stripped = value.stripTrailingZeros();
        return stripped.scale() < 0 ? stripped.setScale(0) : stripped;
    }

    /** Pourcentage {@code part / total × 100} arrondi à l'entier ; {@code 0} si total nul. */
    public static int pct(long part, long total) {
        if (total == 0) {
            return 0;
        }
        return BigDecimal.valueOf(part * 100L)
                .divide(BigDecimal.valueOf(total), 0, RoundingMode.HALF_UP)
                .intValue();
    }

    /** Variation relative en % arrondie, {@code null} si pas de base de comparaison. */
    public static Integer deltaPct(long current, long previous) {
        if (previous == 0) {
            return null;
        }
        return BigDecimal.valueOf((current - previous) * 100L)
                .divide(BigDecimal.valueOf(previous), 0, RoundingMode.HALF_UP)
                .intValue();
    }

    /** Format français pour les messages : 89 → "89", 12638.5 → "12 638,5". */
    public static String formatTnd(long millimes) {
        DecimalFormatSymbols symbols = DecimalFormatSymbols.getInstance(Locale.FRANCE);
        symbols.setGroupingSeparator(' ');
        symbols.setDecimalSeparator(',');
        DecimalFormat format = new DecimalFormat("#,##0.###", symbols);
        return format.format(BigDecimal.valueOf(millimes).movePointLeft(3));
    }
}
