package com.shiftcart.stats;

import java.math.BigDecimal;
import java.util.List;

/** Formes JSON des statistiques (docs/CONTRACT.md). */
public final class StatsDtos {

    private StatsDtos() {}

    public record Kpis(String month, long orders, Integer ordersDeltaPct, BigDecimal revenueTnd,
            Integer revenueDeltaPct, int returnRatePct, Integer returnRateDeltaPts, long toConfirm) {}

    public record Finance(String month, BigDecimal orderedTnd, BigDecimal collectedTnd, int collectionRatePct,
            BigDecimal returnsTnd, BigDecimal inProgressTnd, BigDecimal carrierFeesTnd, long shippedParcels,
            BigDecimal netTnd, BigDecimal carrierFeeTnd, List<Week> weekly) {}

    public record Week(String label, BigDecimal orderedTnd, BigDecimal collectedTnd) {}

    public record GovernorateRow(String governorate, long orders, long delivered, long returned,
            BigDecimal collectedTnd, int sharePct) {}
}
