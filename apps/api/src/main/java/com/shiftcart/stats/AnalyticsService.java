package com.shiftcart.stats;

import com.shiftcart.common.money.Money;
import com.shiftcart.stats.StatsDtos.Analytics;
import com.shiftcart.stats.StatsDtos.Bucket;
import com.shiftcart.stats.StatsDtos.Funnel;
import com.shiftcart.stats.StatsDtos.GovernorateShare;
import com.shiftcart.stats.StatsDtos.HeatCell;
import com.shiftcart.stats.StatsDtos.PreviousBucket;
import com.shiftcart.stats.StatsDtos.ProductShare;
import com.shiftcart.stats.StatsDtos.SourceShare;
import com.shiftcart.stats.StatsDtos.Summary;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Analytique du tableau de bord sur une période libre ({@link AnalyticsRange}), même cohorte que
 * {@link StatsService} : les commandes <b>créées</b> dans la période (heure de Tunis), filtre pack optionnel.
 * <ul>
 *   <li>CA = Σ hors annulées ; encaissé = Σ DELIVERED ; panier moyen = CA ÷ commandes non annulées ;</li>
 *   <li>taux de confirmation = commandes ayant atteint « confirmée » ÷ commandes ;</li>
 *   <li>taux de livraison = DELIVERED ÷ commandes expédiées (atteint « expédiée ») ;</li>
 *   <li>taux de retour = RETURNED ÷ (DELIVERED + RETURNED), comme {@link StatsService#kpis} ;</li>
 *   <li>délais moyens : création → confirmation (heures), création → livraison (jours).</li>
 * </ul>
 * Aucune donnée personnelle (nom, téléphone, adresse) n'est lue.
 */
@Service
public class AnalyticsService {

    private static final String TZ = "'Africa/Tunis'";
    private static final String COHORT = " created_at >= :start AND created_at < :end";
    /** A atteint l'étape « confirmée » (date posée, ou statut au-delà pour les données sans date). */
    private static final String REACHED_CONFIRMED =
            "(confirmed_at IS NOT NULL OR status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED', 'RETURNED'))";
    private static final String REACHED_SHIPPED =
            "(shipped_at IS NOT NULL OR status IN ('SHIPPED', 'DELIVERED', 'RETURNED'))";
    private static final String IN_PROGRESS = "status IN ('NEW', 'PENDING', 'CONFIRMED', 'SHIPPED')";

    private final NamedParameterJdbcTemplate jdbc;

    public AnalyticsService(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * @param compare fenêtre du résumé de comparaison ({@code previous}) ; {@code null} = la période précédente.
     *     La série de comparaison couvre toujours la période précédente entière.
     */
    @Transactional(readOnly = true)
    public Analytics analytics(AnalyticsRange range, AnalyticsRange compare, Long productId) {
        AnalyticsRange prev = range.previous();
        AnalyticsRange cmp = compare == null ? prev : compare;
        MapSqlParameterSource cur = params(range, productId);
        MapSqlParameterSource before = params(prev, productId);
        return new Analytics(range.from().toString(), range.to().toString(), range.granularity().json(),
                prev.from().toString(), prev.to().toString(), cmp.from().toString(), cmp.to().toString(),
                summary(cur, productId), summary(params(cmp, productId), productId),
                series(range, cur, productId), previousSeries(prev, before, productId),
                funnel(cur, productId), products(cur, productId), governorates(cur, productId),
                sources(cur, productId), heatmap(cur, productId));
    }

    private Summary summary(MapSqlParameterSource params, Long productId) {
        return jdbc.queryForObject("""
                SELECT count(*) AS orders,
                       coalesce(sum(amount_millimes) FILTER (WHERE status <> 'CANCELLED'), 0) AS revenue,
                       count(*) FILTER (WHERE status <> 'CANCELLED') AS billable,
                       coalesce(sum(amount_millimes) FILTER (WHERE status = 'DELIVERED'), 0) AS collected,
                       count(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
                       count(*) FILTER (WHERE""" + " " + IN_PROGRESS + """
                ) AS in_progress,
                       count(*) FILTER (WHERE status = 'RETURNED') AS returned,
                       count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled,
                       count(*) FILTER (WHERE""" + " " + REACHED_CONFIRMED + """
                ) AS confirmed,
                       count(*) FILTER (WHERE""" + " " + REACHED_SHIPPED + """
                ) AS shipped,
                       avg(extract(epoch FROM confirmed_at - created_at)) FILTER (WHERE confirmed_at IS NOT NULL)
                           AS confirm_seconds,
                       avg(extract(epoch FROM delivered_at - created_at)) FILTER (WHERE delivered_at IS NOT NULL)
                           AS delivery_seconds
                FROM customer_order WHERE""" + COHORT + product(productId),
                params,
                (rs, i) -> {
                    long orders = rs.getLong("orders");
                    long revenue = rs.getLong("revenue");
                    long billable = rs.getLong("billable");
                    long delivered = rs.getLong("delivered");
                    long returned = rs.getLong("returned");
                    Double confirmSeconds = nullableDouble(rs, "confirm_seconds");
                    Double deliverySeconds = nullableDouble(rs, "delivery_seconds");
                    return new Summary(orders, Money.toTnd(revenue), Money.toTnd(rs.getLong("collected")),
                            Money.toTnd(billable == 0 ? 0 : Math.round((double) revenue / billable)),
                            delivered, rs.getLong("in_progress"), returned, rs.getLong("cancelled"),
                            rate(rs.getLong("confirmed"), orders), rate(delivered, rs.getLong("shipped")),
                            rate(returned, delivered + returned),
                            confirmSeconds == null ? null : round1(confirmSeconds / 3600),
                            deliverySeconds == null ? null : round1(deliverySeconds / 86400));
                });
    }

    /** Une ligne par tranche, tranches vides comprises (generate_series en heure locale). */
    private List<Bucket> series(AnalyticsRange range, MapSqlParameterSource params, Long productId) {
        return jdbc.query(seriesSql(productId) + """
                SELECT b.bucket,
                       count(o.bucket) AS orders,
                       coalesce(sum(o.amount_millimes) FILTER (WHERE o.status <> 'CANCELLED'), 0) AS revenue,
                       coalesce(sum(o.amount_millimes) FILTER (WHERE o.status = 'DELIVERED'), 0) AS collected,
                       count(o.bucket) FILTER (WHERE o.status = 'DELIVERED') AS delivered,
                       count(o.bucket) FILTER (WHERE o.""" + IN_PROGRESS + """
                ) AS in_progress,
                       count(o.bucket) FILTER (WHERE o.status = 'RETURNED') AS returned,
                       count(o.bucket) FILTER (WHERE o.status = 'CANCELLED') AS cancelled
                FROM buckets b LEFT JOIN o ON o.bucket = b.bucket
                GROUP BY b.bucket ORDER BY b.bucket
                """,
                seriesParams(range, params),
                (rs, i) -> new Bucket(bucket(rs), rs.getLong("orders"), Money.toTnd(rs.getLong("revenue")),
                        Money.toTnd(rs.getLong("collected")), rs.getLong("delivered"), rs.getLong("in_progress"),
                        rs.getLong("returned"), rs.getLong("cancelled")));
    }

    private List<PreviousBucket> previousSeries(AnalyticsRange range, MapSqlParameterSource params, Long productId) {
        return jdbc.query(seriesSql(productId) + """
                SELECT b.bucket,
                       count(o.bucket) AS orders,
                       coalesce(sum(o.amount_millimes) FILTER (WHERE o.status <> 'CANCELLED'), 0) AS revenue,
                       coalesce(sum(o.amount_millimes) FILTER (WHERE o.status = 'DELIVERED'), 0) AS collected
                FROM buckets b LEFT JOIN o ON o.bucket = b.bucket
                GROUP BY b.bucket ORDER BY b.bucket
                """,
                seriesParams(range, params),
                (rs, i) -> new PreviousBucket(bucket(rs), rs.getLong("orders"), Money.toTnd(rs.getLong("revenue")),
                        Money.toTnd(rs.getLong("collected"))));
    }

    /**
     * CTE communes : {@code buckets} (toutes les tranches de la période) et {@code o} (commandes de la cohorte
     * avec leur tranche). Une semaine commence le lundi ; la 1re tranche peut déborder avant {@code from}.
     */
    private static String seriesSql(Long productId) {
        return """
                WITH buckets AS (
                    SELECT generate_series(date_trunc(:unit, CAST(:localStart AS timestamp)),
                                           CAST(:localEnd AS timestamp) - interval '1 microsecond',
                                           CAST(:step AS interval)) AS bucket
                ), o AS (
                    SELECT date_trunc(:unit, created_at AT TIME ZONE""" + " " + TZ + """
                ) AS bucket, status, amount_millimes
                    FROM customer_order WHERE""" + COHORT + product(productId) + """
                )
                """;
    }

    private static MapSqlParameterSource seriesParams(AnalyticsRange range, MapSqlParameterSource base) {
        return new MapSqlParameterSource(base.getValues())
                .addValue("unit", range.granularity().unit)
                .addValue("step", range.granularity().step)
                .addValue("localStart", range.localStart())
                .addValue("localEnd", range.localEnd());
    }

    private static String bucket(ResultSet rs) throws SQLException {
        return rs.getObject("bucket", LocalDateTime.class).toString();
    }

    private Funnel funnel(MapSqlParameterSource params, Long productId) {
        return jdbc.queryForObject("SELECT count(*) AS received, count(*) FILTER (WHERE " + REACHED_CONFIRMED
                + ") AS confirmed, count(*) FILTER (WHERE " + REACHED_SHIPPED
                + ") AS shipped, count(*) FILTER (WHERE status = 'DELIVERED') AS delivered"
                + " FROM customer_order WHERE" + COHORT + product(productId),
                params,
                (rs, i) -> new Funnel(rs.getLong("received"), rs.getLong("confirmed"), rs.getLong("shipped"),
                        rs.getLong("delivered")));
    }

    private List<ProductShare> products(MapSqlParameterSource params, Long productId) {
        return jdbc.query("""
                SELECT p.id, p.name, count(*) AS orders,
                       coalesce(sum(o.amount_millimes) FILTER (WHERE o.status <> 'CANCELLED'), 0) AS revenue
                FROM customer_order o JOIN product p ON p.id = o.product_id
                WHERE o.created_at >= :start AND o.created_at < :end"""
                + (productId == null ? "" : " AND o.product_id = :productId") + """
                 GROUP BY p.id, p.name ORDER BY orders DESC, revenue DESC, p.id
                """,
                params,
                (rs, i) -> new ProductShare(rs.getLong("id"), rs.getString("name"), rs.getLong("orders"),
                        Money.toTnd(rs.getLong("revenue"))));
    }

    private List<GovernorateShare> governorates(MapSqlParameterSource params, Long productId) {
        return jdbc.query("""
                SELECT governorate, count(*) AS orders,
                       coalesce(sum(amount_millimes) FILTER (WHERE status <> 'CANCELLED'), 0) AS revenue
                FROM customer_order WHERE""" + COHORT + product(productId) + """
                 GROUP BY governorate ORDER BY orders DESC, revenue DESC, governorate
                """,
                params,
                (rs, i) -> new GovernorateShare(rs.getString("governorate"), rs.getLong("orders"),
                        Money.toTnd(rs.getLong("revenue"))));
    }

    private List<SourceShare> sources(MapSqlParameterSource params, Long productId) {
        return jdbc.query("""
                SELECT nullif(trim(utm_source), '') AS source, count(*) AS orders,
                       coalesce(sum(amount_millimes) FILTER (WHERE status <> 'CANCELLED'), 0) AS revenue
                FROM customer_order WHERE""" + COHORT + product(productId) + """
                 GROUP BY 1 ORDER BY orders DESC, revenue DESC, source NULLS LAST
                """,
                params,
                (rs, i) -> new SourceShare(rs.getString("source"), rs.getLong("orders"),
                        Money.toTnd(rs.getLong("revenue"))));
    }

    private List<HeatCell> heatmap(MapSqlParameterSource params, Long productId) {
        return jdbc.query("SELECT extract(isodow FROM created_at AT TIME ZONE " + TZ + ")::int AS weekday,"
                + " extract(hour FROM created_at AT TIME ZONE " + TZ + ")::int AS hour, count(*) AS orders"
                + " FROM customer_order WHERE" + COHORT + product(productId)
                + " GROUP BY 1, 2 ORDER BY 1, 2",
                params,
                (rs, i) -> new HeatCell(rs.getInt("weekday"), rs.getInt("hour"), rs.getLong("orders")));
    }

    private static String product(Long productId) {
        return productId == null ? "" : " AND product_id = :productId";
    }

    private static MapSqlParameterSource params(AnalyticsRange range, Long productId) {
        return new MapSqlParameterSource()
                .addValue("start", OffsetDateTime.ofInstant(range.start(), ZoneOffset.UTC))
                .addValue("end", OffsetDateTime.ofInstant(range.end(), ZoneOffset.UTC))
                .addValue("productId", productId);
    }

    private static Double nullableDouble(ResultSet rs, String column) throws SQLException {
        BigDecimal v = rs.getBigDecimal(column);
        return v == null ? null : v.doubleValue();
    }

    /** part ÷ total en %, une décimale ; 0 si total nul. */
    static double rate(long part, long total) {
        if (total == 0) {
            return 0;
        }
        return BigDecimal.valueOf(part * 100L).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private static double round1(double v) {
        return BigDecimal.valueOf(v).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }
}
