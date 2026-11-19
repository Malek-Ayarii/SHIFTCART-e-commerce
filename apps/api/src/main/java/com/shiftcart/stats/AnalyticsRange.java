package com.shiftcart.stats;

import com.shiftcart.common.config.CoreConfig;
import com.shiftcart.common.error.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Locale;

/**
 * Période d'analyse : jours civils {@code from}…{@code to} inclus, en heure de Tunis, découpée en tranches
 * ({@link Granularity}). Bornes UTC [start, end) pour filtrer {@code created_at}.
 *
 * <p>Période de comparaison ({@link #previous()}) : si la période couvre des mois civils entiers (mois, année,
 * trimestre…), les mêmes mois juste avant ; sinon le même nombre de jours juste avant (veille, semaine
 * précédente, plage personnalisée).
 */
public record AnalyticsRange(LocalDate from, LocalDate to, Granularity granularity) {

    /** Au-delà, la requête devient trop large pour un tableau de bord (5 ans). */
    static final long MAX_DAYS = 1830;

    public enum Granularity {
        HOUR("hour", "1 hour", 7),
        DAY("day", "1 day", 400),
        WEEK("week", "1 week", MAX_DAYS),
        MONTH("month", "1 month", MAX_DAYS);

        /** Unité de {@code date_trunc}. */
        final String unit;
        /** Pas de {@code generate_series}. */
        final String step;
        /** Nombre de jours max couverts à cette granularité (limite le nombre de tranches). */
        final long maxDays;

        Granularity(String unit, String step, long maxDays) {
            this.unit = unit;
            this.step = step;
            this.maxDays = maxDays;
        }

        public String json() {
            return unit;
        }

        static Granularity parse(String value) {
            try {
                return valueOf(value.trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException e) {
                throw ApiException.badRequest("granularity doit valoir hour, day, week ou month.");
            }
        }

        /** Choix par défaut selon la durée : ≤ 2 j → heure, ≤ 62 j → jour, ≤ 183 j → semaine, sinon mois. */
        static Granularity auto(long days) {
            if (days <= 2) return HOUR;
            if (days <= 62) return DAY;
            if (days <= 183) return WEEK;
            return MONTH;
        }
    }

    /**
     * {@code from}/{@code to} au format AAAA-MM-JJ (défaut : les 30 derniers jours, aujourd'hui compris) ;
     * {@code granularity} optionnelle. 400 si dates invalides, inversées, trop éloignées ou trop de tranches.
     */
    public static AnalyticsRange parse(String from, String to, String granularity, Clock clock) {
        LocalDate today = LocalDate.now(clock.withZone(CoreConfig.TUNIS));
        LocalDate end = blank(to) ? today : date(to, "to");
        LocalDate start = blank(from) ? end.minusDays(29) : date(from, "from");
        if (end.isBefore(start)) {
            throw ApiException.badRequest("La date de fin doit être après la date de début.");
        }
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        if (days > MAX_DAYS) {
            throw ApiException.badRequest("La période ne peut pas dépasser 5 ans.");
        }
        Granularity g = blank(granularity) ? Granularity.auto(days) : Granularity.parse(granularity);
        if (days > g.maxDays) {
            throw ApiException.badRequest("Période trop longue pour un découpage par " + g.unit + ".");
        }
        return new AnalyticsRange(start, end, g);
    }

    /**
     * Fenêtre de comparaison explicite des KPI ({@code compareFrom}/{@code compareTo}, les deux ou aucun) :
     * ex. « 1er–16 octobre » pour comparer un mois en cours à la même durée du mois précédent. {@code null} si
     * absente (on compare alors à {@link #previous()}).
     */
    public AnalyticsRange comparison(String compareFrom, String compareTo) {
        if (blank(compareFrom) && blank(compareTo)) {
            return null;
        }
        if (blank(compareFrom) || blank(compareTo)) {
            throw ApiException.badRequest("compareFrom et compareTo vont ensemble.");
        }
        LocalDate start = date(compareFrom, "compareFrom");
        LocalDate end = date(compareTo, "compareTo");
        if (end.isBefore(start)) {
            throw ApiException.badRequest("La fin de la comparaison doit être après son début.");
        }
        if (ChronoUnit.DAYS.between(start, end) + 1 > MAX_DAYS) {
            throw ApiException.badRequest("La période de comparaison ne peut pas dépasser 5 ans.");
        }
        return new AnalyticsRange(start, end, granularity);
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static LocalDate date(String value, String name) {
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest(name + " doit être une date au format AAAA-MM-JJ.");
        }
    }

    public long days() {
        return ChronoUnit.DAYS.between(from, to) + 1;
    }

    /** Début (inclus) en UTC. */
    public Instant start() {
        return from.atStartOfDay(CoreConfig.TUNIS).toInstant();
    }

    /** Fin (exclue) en UTC : minuit le lendemain de {@code to}. */
    public Instant end() {
        return to.plusDays(1).atStartOfDay(CoreConfig.TUNIS).toInstant();
    }

    /** Premier jour, heure locale (borne basse de la série). */
    LocalDateTime localStart() {
        return from.atStartOfDay();
    }

    /** Lendemain de {@code to} à minuit, heure locale (borne haute exclue de la série). */
    LocalDateTime localEnd() {
        return to.plusDays(1).atStartOfDay();
    }

    /** Mois civils entiers ? (1er du mois → dernier jour d'un mois) */
    boolean wholeMonths() {
        return from.getDayOfMonth() == 1 && to.getDayOfMonth() == to.lengthOfMonth();
    }

    public AnalyticsRange previous() {
        if (wholeMonths()) {
            long months = ChronoUnit.MONTHS.between(from, to.plusDays(1));
            LocalDate prevFrom = from.minusMonths(months);
            return new AnalyticsRange(prevFrom, from.minusDays(1), granularity);
        }
        long days = days();
        return new AnalyticsRange(from.minusDays(days), from.minusDays(1), granularity);
    }
}
