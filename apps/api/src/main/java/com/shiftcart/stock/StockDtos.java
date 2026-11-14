package com.shiftcart.stock;

import java.math.BigDecimal;
import java.util.List;

/** Formes JSON du stock (docs/CONTRACT.md). */
public final class StockDtos {

    private StockDtos() {}

    public record ItemDto(Long id, String name, BigDecimal unitCostTnd, int quantity, int threshold, int perPack,
            String status) {}

    public record StockResponse(
            List<ItemDto> items,
            int completePacks,
            int packThreshold,
            boolean alert,
            int assemblablePacks,
            BigDecimal packPriceTnd,
            BigDecimal cogsTnd,
            BigDecimal carrierFeeTnd,
            BigDecimal marginTnd,
            BigDecimal marginPct) {}

    public record ItemPatch(Long id, Integer quantity, BigDecimal unitCostTnd, Integer threshold) {}

    public record StockPatch(List<ItemPatch> items) {}

    public record AssembleRequest(Integer packs) {}
}
