package com.shiftcart.stats;

import com.shiftcart.common.config.AppProperties;
import com.shiftcart.common.money.Money;
import com.shiftcart.common.time.MonthRange;
import com.shiftcart.stats.StatsDtos.Finance;
import com.shiftcart.stats.StatsDtos.GovernorateRow;
import com.shiftcart.stats.StatsDtos.Kpis;
import com.shiftcart.stats.StatsDtos.ProductRow;
import com.shiftcart.stats.StatsDtos.Week;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Statistiques du back-office. Toutes les vues portent sur la <b>cohorte des commandes créées dans le mois</b>
 * (heure de Tunis), sauf mention contraire :
 * <ul>
 *   <li>commandes = toutes les commandes créées (annulées comprises) ;</li>
 *   <li>CA commandé = Σ montants hors annulées ; encaissé = Σ DELIVERED ; retours = Σ RETURNED ;
 *       en cours = Σ NEW/PENDING/CONFIRMED/SHIPPED (commandé = encaissé + retours + en cours) ;</li>
 *   <li>taux de retour = RETURNED ÷ (DELIVERED + RETURNED) ;</li>
 *   <li>à confirmer = NEW + PENDING, tous mois confondus (file de travail actuelle) ;</li>
 *   <li>colis expédiés = commandes dont {@code shipped_at} tombe dans le mois, plus celles du mois au statut
 *       SHIPPED/DELIVERED/RETURNED sans date d'expédition ; frais transporteur = colis × {@code CARRIER_FEE_TND} ;
 *       CA net = encaissé − frais transporteur ;</li>
 *   <li>semaines S1…S5 = jours 1–7, 8–14, 15–21, 22–28, 29–fin du mois.</li>
 * </ul>
 * Toutes les vues acceptent un filtre optionnel par pack ({@code productId}) ; {@link #products} ventile par pack
 * (packs actifs + packs inactifs ayant des commandes dans le mois).
 */
@Service
public class StatsService {

    private static final String COHORT_DATES = " created_at >= :start AND created_at < :end";

    private final NamedParameterJdbcTemplate jdbc;
    private final AppProperties props;

    public StatsService(NamedParameterJdbcTemplate jdbc, AppProperties props) {
        this.jdbc = jdbc;
        this.props = props;
    }

    private record Cohort(long orders, long revenue, long delivered, long returned) {}

    @Transactional(readOnly = true)
    public Kpis kpis(MonthRange month, Long productId) {
        Cohort cur = cohort(month, productId);
        Cohort prev = cohort(month.previous(), productId);
        int rate = Money.pct(cur.returned(), cur.delivered() + cur.returned());
        Integer rateDelta = prev.delivered() + prev.returned() == 0 || cur.delivered() + cur.returned() == 0 ? null
                : rate - Money.pct(prev.returned(), prev.delivered() + prev.returned());
        Long toConfirm = jdbc.queryForObject(
                "SELECT count(*) FROM customer_order WHERE status IN ('NEW', 'PENDING')" + product(productId),
                new MapSqlParameterSource("productId", productId), Long.class);
        return new Kpis(month.label(), cur.orders(), Money.deltaPct(cur.orders(), prev.orders()),
                Money.toTnd(cur.revenue()), Money.deltaPct(cur.revenue(), prev.revenue()), rate, rateDelta,
                toConfirm == null ? 0 : toConfirm);
    }

    private Cohort cohort(MonthRange month, Long productId) {
        return jdbc.queryForObject("""
                SELECT count(*) AS orders,
                       coalesce(sum(amount_millimes) FILTER (WHERE status <> 'CANCELLED'), 0) AS revenue,
                       count(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
                       count(*) FILTER (WHERE status = 'RETURNED') AS returned
                FROM customer_order WHERE""" + cohort(productId),
                params(month, productId),
                (rs, i) -> new Cohort(rs.getLong("orders"), rs.getLong("revenue"), rs.getLong("delivered"),
                        rs.getLong("returned")));
    }

    @Transactional(readOnly = true)
    public Finance finance(MonthRange month, Long productId) {
        MapSqlParameterSource params = params(month, productId);
        long[] totals = jdbc.queryForObject("""
                SELECT coalesce(sum(amount_millimes) FILTER (WHERE status <> 'CANCELLED'), 0),
                       coalesce(sum(amount_millimes) FILTER (WHERE status = 'DELIVERED'), 0),
                       coalesce(sum(amount_millimes) FILTER (WHERE status = 'RETURNED'), 0),
                       coalesce(sum(amount_millimes) FILTER (WHERE status IN ('NEW', 'PENDING', 'CONFIRMED', 'SHIPPED')), 0)
                FROM customer_order WHERE""" + cohort(productId),
                params,
                (rs, i) -> new long[] {rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4)});
        long ordered = totals[0];
        long collected = totals[1];
        long returns = totals[2];
        long inProgress = totals[3];

        Long parcels = jdbc.queryForObject("""
                SELECT count(*) FROM customer_order
                WHERE ((shipped_at >= :start AND shipped_at < :end)
                   OR (shipped_at IS NULL AND status IN ('SHIPPED', 'DELIVERED', 'RETURNED') AND""" + COHORT_DATES + "))"
                + product(productId),
                params, Long.class);
        long shippedParcels = parcels == null ? 0 : parcels;
        long feeMillimes = Money.toMillimes(props.carrierFeeTnd());
        long carrierFees = feeMillimes * shippedParcels;

        int weeks = month.month().lengthOfMonth() > 28 ? 5 : 4;
        long[] weekOrdered = new long[weeks];
        long[] weekCollected = new long[weeks];
        jdbc.query("""
                SELECT LEAST(((extract(day FROM created_at AT TIME ZONE 'Africa/Tunis')::int - 1) / 7), 4) AS bucket,
                       coalesce(sum(amount_millimes) FILTER (WHERE status <> 'CANCELLED'), 0) AS ordered,
                       coalesce(sum(amount_millimes) FILTER (WHERE status = 'DELIVERED'), 0) AS collected
                FROM customer_order WHERE""" + cohort(productId) + " GROUP BY bucket",
                params,
                rs -> {
                    int b = Math.min(rs.getInt("bucket"), weeks - 1);
                    weekOrdered[b] += rs.getLong("ordered");
                    weekCollected[b] += rs.getLong("collected");
                });
        List<Week> weekly = new ArrayList<>(weeks);
        for (int i = 0; i < weeks; i++) {
            weekly.add(new Week("S" + (i + 1), Money.toTnd(weekOrdered[i]), Money.toTnd(weekCollected[i])));
        }

        return new Finance(month.label(), Money.toTnd(ordered), Money.toTnd(collected), Money.pct(collected, ordered),
                Money.toTnd(returns), Money.toTnd(inProgress), Money.toTnd(carrierFees), shippedParcels,
                Money.toTnd(collected - carrierFees), Money.toTnd(feeMillimes), weekly);
    }

    @Transactional(readOnly = true)
    public List<GovernorateRow> governorates(MonthRange month, Long productId) {
        MapSqlParameterSource params = params(month, productId);
        record Row(String gov, long orders, long delivered, long returned, long collected) {}
        List<Row> rows = jdbc.query("""
                SELECT governorate,
                       count(*) AS orders,
                       count(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
                       count(*) FILTER (WHERE status = 'RETURNED') AS returned,
                       coalesce(sum(amount_millimes) FILTER (WHERE status = 'DELIVERED'), 0) AS collected
                FROM customer_order WHERE""" + cohort(productId) + """
                 GROUP BY governorate
                 ORDER BY orders DESC, governorate ASC
                """,
                params,
                (rs, i) -> new Row(rs.getString("governorate"), rs.getLong("orders"), rs.getLong("delivered"),
                        rs.getLong("returned"), rs.getLong("collected")));
        long total = rows.stream().mapToLong(Row::orders).sum();
        return rows.stream()
                .map(r -> new GovernorateRow(r.gov(), r.orders(), r.delivered(), r.returned(),
                        Money.toTnd(r.collected()), Money.pct(r.orders(), total)))
                .toList();
    }

    /** Par pack (cohorte du mois) : commandes, livrées, retournées, encaissé, part des commandes. */
    @Transactional(readOnly = true)
    public List<ProductRow> products(MonthRange month) {
        MapSqlParameterSource params = params(month, null);
        record Row(long productId, String name, long orders, long delivered, long returned, long collected) {}
        List<Row> rows = jdbc.query("""
                SELECT p.id, p.name,
                       count(o.id) AS orders,
                       count(o.id) FILTER (WHERE o.status = 'DELIVERED') AS delivered,
                       count(o.id) FILTER (WHERE o.status = 'RETURNED') AS returned,
                       coalesce(sum(o.amount_millimes) FILTER (WHERE o.status = 'DELIVERED'), 0) AS collected
                FROM product p
                LEFT JOIN customer_order o ON o.product_id = p.id
                     AND o.created_at >= :start AND o.created_at < :end
                GROUP BY p.id, p.name, p.active, p.sort_order
                HAVING p.active OR count(o.id) > 0
                ORDER BY orders DESC, p.sort_order ASC, p.id ASC
                """,
                params,
                (rs, i) -> new Row(rs.getLong("id"), rs.getString("name"), rs.getLong("orders"),
                        rs.getLong("delivered"), rs.getLong("returned"), rs.getLong("collected")));
        long total = rows.stream().mapToLong(Row::orders).sum();
        return rows.stream()
                .map(r -> new ProductRow(r.productId(), r.name(), r.orders(), r.delivered(), r.returned(),
                        Money.toTnd(r.collected()), Money.pct(r.orders(), total)))
                .toList();
    }

    private static String cohort(Long productId) {
        return COHORT_DATES + product(productId);
    }

    private static String product(Long productId) {
        return productId == null ? "" : " AND product_id = :productId";
    }

    private static MapSqlParameterSource params(MonthRange month, Long productId) {
        return new MapSqlParameterSource()
                .addValue("start", OffsetDateTime.ofInstant(month.start(), ZoneOffset.UTC))
                .addValue("end", OffsetDateTime.ofInstant(month.end(), ZoneOffset.UTC))
                .addValue("productId", productId);
    }
}
