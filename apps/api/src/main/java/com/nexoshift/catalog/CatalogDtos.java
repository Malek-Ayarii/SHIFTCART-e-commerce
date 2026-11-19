package com.nexoshift.catalog;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.nexoshift.media.MediaDto;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Formes JSON du catalogue (docs/CONTRACT.md › v2). */
public final class CatalogDtos {

    private CatalogDtos() {}

    public static final String IN_STOCK = "IN_STOCK";
    public static final String MADE_TO_ORDER = "MADE_TO_ORDER";

    /** Point d'intérêt en % (0–100) depuis le coin haut-gauche de la photo principale. */
    public record Hotspot(BigDecimal x, BigDecimal y) {}

    public record PackItem(Long id, Long stockItemId, String name, String description, int quantity, boolean gift,
            MediaDto photo, Hotspot hotspot) {}

    public record ProductPublic(
            Long id,
            String slug,
            String sku,
            String name,
            String badge,
            String tagline,
            String audience,
            String description,
            BigDecimal priceTnd,
            boolean featured,
            int sortOrder,
            MediaDto cover,
            List<MediaDto> gallery,
            List<PackItem> items,
            Savings savings,
            String availability) {}

    public record ProductAdmin(
            @JsonUnwrapped ProductPublic product,
            boolean active,
            Instant createdAt,
            Instant updatedAt,
            int completePacks,
            int assemblablePacks,
            long ordersThisMonth) {}

    public record ProductInput(
            String name,
            String slug,
            String sku,
            String badge,
            String tagline,
            String audience,
            String description,
            BigDecimal priceTnd,
            Boolean active,
            Boolean featured,
            Savings savings) {}

    public record OrderRequest(List<Long> ids) {}

    public record CoverRequest(Long mediaId) {}

    public record GalleryRequest(List<Long> mediaIds) {}

    public record ItemInput(Long stockItemId, Integer quantity, Boolean gift, Hotspot hotspot) {}

    public record ItemsRequest(List<ItemInput> items) {}
}
