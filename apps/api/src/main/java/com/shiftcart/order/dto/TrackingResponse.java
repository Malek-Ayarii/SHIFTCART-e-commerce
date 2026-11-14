package com.shiftcart.order.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Réponse publique de suivi : ni téléphone, ni nom complet, ni adresse (docs/CONTRACT.md). */
public record TrackingResponse(
        String ref,
        String status,
        String productName,
        String productSlug,
        String productCoverUrl,
        BigDecimal amountTnd,
        String governorate,
        String customerFirstName,
        String carrier,
        String trackingNumber,
        LocalDate eta,
        List<Step> steps) {

    /** {@code state} ∈ done | current | upcoming | cancelled. {@code detail} absent du JSON si nul. */
    public record Step(String key, String label, String state, Instant at,
            @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
            String detail) {}
}
