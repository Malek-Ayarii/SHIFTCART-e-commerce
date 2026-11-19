package com.shiftcart.stats;

import com.shiftcart.common.config.AppProperties;
import com.shiftcart.common.money.Money;
import com.shiftcart.common.time.MonthRange;
import com.shiftcart.common.config.CoreConfig;
import com.shiftcart.common.error.ApiException;
import com.shiftcart.stats.StatsDtos.Calendar;
import com.shiftcart.stats.StatsDtos.CalendarDay;
import com.shiftcart.stats.StatsDtos.DayRow;
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
 * {@link #daily} donne une ligne par jour du mois (jours sans commande à 0).
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
        record Row(long productId, String name, long orders, long delivered, long returned, long collected,
                long ordered) {}
        List<Row> rows = jdbc.query("""
                SELECT p.id, p.name,
                       count(o.id) AS orders,
                       count(o.id) FILTER (WHERE o.status = 'DELIVERED') AS delivered,
                       count(o.id) FILTER (WHERE o.status = 'RETURNED') AS returned,
                       coalesce(sum(o.amount_millimes) FILTER (WHERE o.status = 'DELIVERED'), 0) AS collected,
                       coalesce(sum(o.amount_millimes) FILTER (WHERE o.status <> 'CANCELLED'), 0) AS ordered
                FROM product p
                LEFT JOIN customer_order o ON o.product_id = p.id
                     AND o.created_at >= :start AND o.created_at < :end
                GROUP BY p.id, p.name, p.active, p.sort_order
                HAVING p.active OR count(o.id) > 0
                ORDER BY orders DESC, p.sort_order ASC, p.id ASC
                """,
                params,
                (rs, i) -> new Row(rs.getLong("id"), rs.getString("name"), rs.getLong("orders"),
                        rs.getLong("delivered"), rs.getLong("returned"), rs.getLong("collected"),
                        rs.getLong("ordered")));
        long total = rows.stream().mapToLong(Row::orders).sum();
        return rows.stream()
                .map(r -> new ProductRow(r.productId(), r.name(), r.orders(), r.delivered(), r.returned(),
                        Money.toTnd(r.collected()), Money.pct(r.orders(), total), Money.toTnd(r.ordered())))
                .toList();
    }

    /** Une ligne par jour du mois (cohorte, heure de Tunis) ; jours sans commande à 0. */
    @Transactional(readOnly = true)
    public List<DayRow> daily(MonthRange month, Long productId) {
        int days = month.month().lengthOfMonth();
        long[] orders = new long[days];
        long[] ordered = new long[days];
        jdbc.query("""
                SELECT extract(day FROM created_at AT TIME ZONE 'Africa/Tunis')::int AS day,
                       count(*) AS orders,
                       coalesce(sum(amount_millimes) FILTER (WHERE status <> 'CANCELLED'), 0) AS ordered
                FROM customer_order WHERE""" + cohort(productId) + " GROUP BY day",
                params(month, productId),
                rs -> {
                    int d = rs.getInt("day") - 1;
                    if (d >= 0 && d < days) {
                        orders[d] = rs.getLong("orders");
                        ordered[d] = rs.getLong("ordered");
                    }
                });
        List<DayRow> rows = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            rows.add(new DayRow(month.month().atDay(i + 1).toString(), orders[i], Money.toTnd(ordered[i])));
        }
        return rows;
    }

    /** Agenda annuel : une ligne par jour (heure de Tunis), jours sans commande à 0. */
    @Transactional(readOnly = true)
    public Calendar calendar(int year, Long productId) {
        if (year < 2000 || year > 2100) {
            throw ApiException.badRequest("Année invalide.");
        }
        java.time.LocalDate first = java.time.LocalDate.of(year, 1, 1);
        int days = first.lengthOfYear();
        long[][] v = new long[days][5];
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("start", OffsetDateTime.ofInstant(first.atStartOfDay(CoreConfig.TUNIS).toInstant(), ZoneOffset.UTC))
                .addValue("end", OffsetDateTime.ofInstant(first.plusYears(1).atStartOfDay(CoreConfig.TUNIS).toInstant(),
                        ZoneOffset.UTC))
                .addValue("productId", productId);
        jdbc.query("""
                SELECT extract(doy FROM created_at AT TIME ZONE 'Africa/Tunis')::int AS doy,
                       count(*) AS orders,
                       coalesce(sum(amount_millimes) FILTER (WHERE status <> 'CANCELLED'), 0) AS ordered,
                       count(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
                       count(*) FILTER (WHERE status = 'RETURNED') AS returned,
                       count(*) FILTER (WHERE status = 'CANCELLED') AS cancelled
                FROM customer_order WHERE""" + cohort(productId) + " GROUP BY doy",
                params,
                rs -> {
                    int d = rs.getInt("doy") - 1;
                    if (d >= 0 && d < days) {
                        v[d] = new long[] {rs.getLong("orders"), rs.getLong("ordered"), rs.getLong("delivered"),
                                rs.getLong("returned"), rs.getLong("cancelled")};
                    }
                });
        List<CalendarDay> rows = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            rows.add(new CalendarDay(first.plusDays(i).toString(), v[i][0], Money.toTnd(v[i][1]), v[i][2], v[i][3],
                    v[i][4]));
        }
        return new Calendar(year, rows);
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
