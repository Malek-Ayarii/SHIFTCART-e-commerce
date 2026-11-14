package com.shiftcart.stock;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.shiftcart.media.MediaDto;
import java.math.BigDecimal;
import java.util.List;

/** Formes JSON du stock v2 (docs/CONTRACT.md › v2 › stock v2). */
public final class StockDtos {

    private StockDtos() {}

    public record UsedIn(long productId, String name, int perPack) {}

    public record ItemDto(Long id, String name, String description, MediaDto photo, BigDecimal unitCostTnd,
            int quantity, int threshold, String status, List<UsedIn> usedIn) {}

    public record PackDto(long productId, String name, String slug, boolean active, MediaDto cover,
            int completePacks, int assemblablePacks, int packThreshold, boolean alert, BigDecimal priceTnd,
            BigDecimal cogsTnd, BigDecimal carrierFeeTnd, BigDecimal marginTnd, BigDecimal marginPct) {}

    public record StockResponse(List<ItemDto> items, List<PackDto> packs, boolean alert, BigDecimal carrierFeeTnd) {}

    /**
     * Modification d'une pièce. Champ absent = inchangé ; pour {@code description} et {@code photoMediaId},
     * {@code null} explicite = retirer (d'où une classe à setters plutôt qu'un record).
     */
    public static class ItemPatch {
        private Long id;
        private String name;
        private String description;
        private boolean descriptionSet;
        private Long photoMediaId;
        private boolean photoMediaIdSet;
        private Integer quantity;
        private BigDecimal unitCostTnd;
        private Integer threshold;

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
            this.descriptionSet = true;
        }

        @JsonIgnore
        public boolean isDescriptionSet() {
            return descriptionSet;
        }

        public Long getPhotoMediaId() {
            return photoMediaId;
        }

        public void setPhotoMediaId(Long photoMediaId) {
            this.photoMediaId = photoMediaId;
            this.photoMediaIdSet = true;
        }

        @JsonIgnore
        public boolean isPhotoMediaIdSet() {
            return photoMediaIdSet;
        }

        public Integer getQuantity() {
            return quantity;
        }

        public void setQuantity(Integer quantity) {
            this.quantity = quantity;
        }

        public BigDecimal getUnitCostTnd() {
            return unitCostTnd;
        }

        public void setUnitCostTnd(BigDecimal unitCostTnd) {
            this.unitCostTnd = unitCostTnd;
        }

        public Integer getThreshold() {
            return threshold;
        }

        public void setThreshold(Integer threshold) {
            this.threshold = threshold;
        }
    }

    public record StockPatch(List<ItemPatch> items) {}

    public record ItemCreate(String name, String description, Long photoMediaId, BigDecimal unitCostTnd,
            Integer quantity, Integer threshold) {}

    public record AssembleRequest(Long productId, Integer packs) {}
}
