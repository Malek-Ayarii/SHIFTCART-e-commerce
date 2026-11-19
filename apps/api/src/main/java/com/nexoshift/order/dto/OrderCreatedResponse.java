package com.nexoshift.order.dto;

import java.math.BigDecimal;

/** Réponse de {@code POST /api/orders} (201, ou 200 pour un doublon). Jamais l'adresse. */
public record OrderCreatedResponse(
        String ref,
        BigDecimal amountTnd,
        String status,
        String productName,
        String productSlug,
        String productCoverUrl,
        String customerFirstName,
        String phoneDisplay,
        String governorate,
        String trackingToken,
        String whatsappConfirmUrl,
        String trackingUrl) {}
