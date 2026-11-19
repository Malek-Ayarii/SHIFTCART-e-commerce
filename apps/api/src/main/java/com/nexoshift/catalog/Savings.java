package com.nexoshift.catalog;

import java.math.BigDecimal;

/** Calculateur d'économies d'un pack (docs/CONTRACT.md › v2 › Savings). Stocké en JSONB dans {@code product}. */
public record Savings(
        String title,
        String question,
        BigDecimal min,
        BigDecimal max,
        BigDecimal step,
        BigDecimal defaultValue,
        BigDecimal homeCostPerDay,
        Integer daysPerMonth) {}
