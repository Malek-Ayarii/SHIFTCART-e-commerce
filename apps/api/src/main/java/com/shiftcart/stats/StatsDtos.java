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

    public record ProductRow(long productId, String name, long orders, long delivered, long returned,
            BigDecimal collectedTnd, int sharePct, BigDecimal orderedTnd) {}

    /** Un jour du mois (heure de Tunis) : commandes créées et CA commandé hors annulées. */
    public record DayRow(String date, long orders, BigDecimal orderedTnd) {}

    /** Agenda : un jour de l'année (heure de Tunis) avec le détail des issues. */
    public record CalendarDay(String date, long orders, BigDecimal orderedTnd, long delivered, long returned,
            long cancelled) {}

    public record Calendar(int year, List<CalendarDay> days) {}

    // ---------- Analytique (GET /api/admin/stats/analytics) ----------

    /**
     * Analytique d'une période ({@code from}…{@code to}, jours inclus, heure de Tunis). {@code previousSeries} couvre
     * la période précédente entière ({@code previousFrom}…{@code previousTo}), alignée par index de tranche ;
     * {@code previous} résume la fenêtre de comparaison ({@code compareFrom}…{@code compareTo}, par défaut la
     * période précédente).
     */
    public record Analytics(String from, String to, String granularity, String previousFrom, String previousTo,
            String compareFrom, String compareTo, Summary summary, Summary previous, List<Bucket> series,
            List<PreviousBucket> previousSeries, Funnel funnel, List<ProductShare> products, List<GovernorateShare> governorates,
            List<SourceShare> sources, List<HeatCell> heatmap) {}

    /**
     * Cohorte des commandes créées dans la période. {@code revenueTnd} = Σ hors annulées ; {@code avgOrderTnd} =
     * revenue ÷ commandes non annulées ; taux en % à une décimale ; délais moyens {@code null} sans donnée.
     */
    public record Summary(long orders, BigDecimal revenueTnd, BigDecimal collectedTnd, BigDecimal avgOrderTnd,
            long delivered, long inProgress, long returned, long cancelled, double confirmationRatePct,
            double deliveryRatePct, double returnRatePct, Double avgConfirmHours, Double avgDeliveryDays) {}

    /** {@code start} = début de la tranche, heure locale (AAAA-MM-JJTHH:MM:SS). */
    public record Bucket(String start, long orders, BigDecimal revenueTnd, BigDecimal collectedTnd, long delivered,
            long inProgress, long returned, long cancelled) {}

    public record PreviousBucket(String start, long orders, BigDecimal revenueTnd, BigDecimal collectedTnd) {}

    /** Étapes atteintes (une commande annulée après confirmation compte comme confirmée). */
    public record Funnel(long received, long confirmed, long shipped, long delivered) {}

    public record ProductShare(long productId, String name, long orders, BigDecimal revenueTnd) {}

    public record GovernorateShare(String governorate, long orders, BigDecimal revenueTnd) {}

    /** {@code source} = utm_source, {@code null} pour le trafic direct. */
    public record SourceShare(String source, long orders, BigDecimal revenueTnd) {}

    /** Jour ISO (1 = lundi … 7 = dimanche) × heure locale (0–23) ; seules les cases non vides sont renvoyées. */
    public record HeatCell(int weekday, int hour, long orders) {}
}
