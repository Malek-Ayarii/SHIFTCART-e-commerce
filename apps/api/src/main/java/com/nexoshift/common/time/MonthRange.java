package com.nexoshift.common.time;

import com.nexoshift.common.config.CoreConfig;
import com.nexoshift.common.error.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;

/** Un mois civil en heure de Tunis, converti en bornes UTC [start, end). */
public record MonthRange(YearMonth month, Instant start, Instant end) {

    public static MonthRange of(YearMonth month) {
        Instant start = month.atDay(1).atStartOfDay(CoreConfig.TUNIS).toInstant();
        Instant end = month.plusMonths(1).atDay(1).atStartOfDay(CoreConfig.TUNIS).toInstant();
        return new MonthRange(month, start, end);
    }

    /** {@code "2026-11"} → mois ; vide → mois courant (Africa/Tunis) ; invalide → 400. */
    public static MonthRange parseOrCurrent(String value, Clock clock) {
        if (value == null || value.isBlank()) {
            return of(YearMonth.now(clock.withZone(CoreConfig.TUNIS)));
        }
        return of(parse(value));
    }

    /** {@code null} si vide. */
    public static MonthRange parseOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return of(parse(value));
    }

    private static YearMonth parse(String value) {
        try {
            return YearMonth.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw ApiException.badRequest("Le mois doit être au format AAAA-MM.");
        }
    }

    public MonthRange previous() {
        return of(month.minusMonths(1));
    }

    public String label() {
        return month.toString();
    }
}
