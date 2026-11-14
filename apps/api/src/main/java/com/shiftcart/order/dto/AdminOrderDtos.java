package com.shiftcart.order.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Formes JSON de l'admin commandes (docs/CONTRACT.md). */
public final class AdminOrderDtos {

    private AdminOrderDtos() {}

    public record OrderSummary(
            Long id,
            String ref,
            String customerName,
            String phone,
            String governorate,
            String productName,
            int quantity,
            BigDecimal amountTnd,
            String status,
            String carrier,
            String trackingNumber,
            String source,
            Instant createdAt) {}

    public record OrderDetail(
            @JsonUnwrapped OrderSummary summary,
            String productSku,
            Instant confirmedAt,
            Instant shippedAt,
            Instant deliveredAt,
            Instant returnedAt,
            List<EventDto> events,
            List<MessageDto> messages,
            List<String> allowedTransitions) {}

    public record EventDto(Long id, String fromStatus, String toStatus, String actor, String note,
            Instant createdAt) {}

    public record MessageDto(Long id, String direction, String channel, String tone, String body, String status,
            Instant createdAt) {}

    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {}

    public record StatusPatch(String status, String carrier, String trackingNumber, String note) {}

    public record GenerateRequest(String tone) {}

    public record GenerateResponse(String body) {}

    public record SendRequest(String body, String tone) {}
}
