package com.shiftcart.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftcart.IntegrationTest;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * GET /api/admin/stats/analytics sur un jeu connu (janvier 2042 comparé à décembre 2041 ; Tunis = UTC+1).
 * Le 6 janvier 2042 est un lundi.
 */
class AnalyticsApiTest extends IntegrationTest {

    private static boolean seeded;
    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = adminToken();
        if (!seeded) {
            seed();
            seeded = true;
        }
    }

    private void seed() {
        // ref, statut, gouvernorat, pack, utm, créée, confirmée, expédiée, livrée (heure de Tunis)
        insert("SC-A1", "DELIVERED", "Tunis", "PACK-BARISTA", "tiktok", "2042-01-06T10:00+01:00",
                "2042-01-06T12:00+01:00", "2042-01-07T10:00+01:00", "2042-01-08T10:00+01:00");
        insert("SC-A2", "DELIVERED", "Sousse", "PACK-SETUP", "instagram", "2042-01-06T21:30+01:00",
                "2042-01-07T01:30+01:00", "2042-01-08T10:00+01:00", "2042-01-10T21:30+01:00");
        insert("SC-A3", "RETURNED", "Tunis", "PACK-BARISTA", "tiktok", "2042-01-15T14:00+01:00",
                "2042-01-15T15:00+01:00", "2042-01-16T10:00+01:00", null);
        insert("SC-A4", "CANCELLED", "Sfax", "PACK-BARISTA", null, "2042-01-20T09:00+01:00", null, null, null);
        // 23:30 le 31 janvier à Tunis = 22:30 UTC : compte le 31 janvier.
        insert("SC-A5", "NEW", "Tunis", "PACK-BARISTA", "tiktok", "2042-01-31T23:30+01:00", null, null, null);
        // Décembre 2041 : période de comparaison.
        insert("SC-A6", "DELIVERED", "Tunis", "PACK-BARISTA", "tiktok", "2041-12-10T10:00+01:00",
                "2041-12-10T12:00+01:00", "2041-12-11T10:00+01:00", "2041-12-13T10:00+01:00");
        insert("SC-A7", "NEW", "Tunis", "PACK-BARISTA", null, "2041-12-11T10:00+01:00", null, null, null);
    }

    private void insert(String ref, String status, String gov, String sku, String utm, String created,
            String confirmed, String shipped, String delivered) {
        jdbc.update("""
                INSERT INTO customer_order (ref, product_id, quantity, amount_millimes, customer_name, phone_e164,
                    governorate, address, status, utm_source, created_at, updated_at, confirmed_at, shipped_at,
                    delivered_at)
                SELECT ?, id, 1, price_millimes, 'Test Client', '+21690000000', ?, 'Adresse de test, Tunis', ?, ?,
                    ?, ?, ?, ?, ?
                FROM product WHERE sku = ?
                """, ref, gov, status, utm, ts(created), ts(created), ts(confirmed), ts(shipped), ts(delivered), sku);
    }

    private static Timestamp ts(String iso) {
        return iso == null ? null : Timestamp.from(OffsetDateTime.parse(iso).toInstant());
    }

    private MockHttpServletRequestBuilder analytics(Map<String, String> params) {
        MockHttpServletRequestBuilder req = get("/api/admin/stats/analytics")
                .header(HttpHeaders.AUTHORIZATION, bearer(token));
        params.forEach(req::param);
        return req;
    }

    private JsonNode getJson(Map<String, String> params) throws Exception {
        return body(mvc.perform(analytics(params)).andExpect(status().isOk()).andReturn());
    }

    private static Map<String, String> range(String from, String to) {
        Map<String, String> m = new HashMap<>();
        m.put("from", from);
        m.put("to", to);
        return m;
    }

    @Test
    void monthSummaryComparedToPreviousMonth() throws Exception {
        JsonNode a = getJson(range("2042-01-01", "2042-01-31"));
        assertThat(a.get("granularity").asText()).isEqualTo("day");
        assertThat(a.get("compareFrom").asText()).isEqualTo("2041-12-01");
        assertThat(a.get("compareTo").asText()).isEqualTo("2041-12-31");
        assertThat(a.get("previousFrom").asText()).isEqualTo("2041-12-01");
        assertThat(a.get("previousTo").asText()).isEqualTo("2041-12-31");

        JsonNode s = a.get("summary");
        assertThat(s.get("orders").asLong()).isEqualTo(5);
        assertThat(s.get("revenueTnd").decimalValue()).isEqualByComparingTo("346");
        assertThat(s.get("collectedTnd").decimalValue()).isEqualByComparingTo("168");
        assertThat(s.get("avgOrderTnd").decimalValue()).isEqualByComparingTo("86.5");
        assertThat(s.get("delivered").asLong()).isEqualTo(2);
        assertThat(s.get("inProgress").asLong()).isEqualTo(1);
        assertThat(s.get("returned").asLong()).isEqualTo(1);
        assertThat(s.get("cancelled").asLong()).isEqualTo(1);
        assertThat(s.get("confirmationRatePct").asDouble()).isEqualTo(60.0);
        assertThat(s.get("deliveryRatePct").asDouble()).isEqualTo(66.7);
        assertThat(s.get("returnRatePct").asDouble()).isEqualTo(33.3);
        assertThat(s.get("avgConfirmHours").asDouble()).isEqualTo(2.3);
        assertThat(s.get("avgDeliveryDays").asDouble()).isEqualTo(3.0);

        JsonNode p = a.get("previous");
        assertThat(p.get("orders").asLong()).isEqualTo(2);
        assertThat(p.get("revenueTnd").decimalValue()).isEqualByComparingTo("178");
        assertThat(p.get("avgDeliveryDays").asDouble()).isEqualTo(3.0);
    }

    @Test
    void dailySeriesHasEveryDayIncludingEmptyOnes() throws Exception {
        JsonNode a = getJson(range("2042-01-01", "2042-01-31"));
        JsonNode series = a.get("series");
        assertThat(series).hasSize(31);
        assertThat(series.get(0).get("start").asText()).isEqualTo("2042-01-01T00:00");
        assertThat(series.get(0).get("orders").asLong()).isZero();
        JsonNode jan6 = series.get(5);
        assertThat(jan6.get("start").asText()).startsWith("2042-01-06");
        assertThat(jan6.get("orders").asLong()).isEqualTo(2);
        assertThat(jan6.get("revenueTnd").decimalValue()).isEqualByComparingTo("168");
        assertThat(jan6.get("delivered").asLong()).isEqualTo(2);
        JsonNode jan20 = series.get(19);
        assertThat(jan20.get("cancelled").asLong()).isEqualTo(1);
        assertThat(jan20.get("revenueTnd").decimalValue()).isEqualByComparingTo("0");
        // La commande de 23:30 (heure de Tunis) reste le 31.
        assertThat(series.get(30).get("orders").asLong()).isEqualTo(1);
        assertThat(series.get(30).get("inProgress").asLong()).isEqualTo(1);

        JsonNode prev = a.get("previousSeries");
        assertThat(prev).hasSize(31);
        assertThat(prev.get(9).get("start").asText()).startsWith("2041-12-10");
        assertThat(prev.get(9).get("orders").asLong()).isEqualTo(1);
        assertThat(prev.get(9).get("collectedTnd").decimalValue()).isEqualByComparingTo("89");
    }

    @Test
    void breakdownsFunnelAndHeatmap() throws Exception {
        JsonNode a = getJson(range("2042-01-01", "2042-01-31"));
        JsonNode f = a.get("funnel");
        assertThat(f.get("received").asLong()).isEqualTo(5);
        assertThat(f.get("confirmed").asLong()).isEqualTo(3);
        assertThat(f.get("shipped").asLong()).isEqualTo(3);
        assertThat(f.get("delivered").asLong()).isEqualTo(2);

        JsonNode products = a.get("products");
        assertThat(products).hasSize(2);
        assertThat(products.get(0).get("name").asText()).isEqualTo("Le Pack Barista");
        assertThat(products.get(0).get("orders").asLong()).isEqualTo(4);
        assertThat(products.get(0).get("revenueTnd").decimalValue()).isEqualByComparingTo("267");
        assertThat(products.get(1).get("revenueTnd").decimalValue()).isEqualByComparingTo("79");

        JsonNode gov = a.get("governorates");
        assertThat(gov.get(0).get("governorate").asText()).isEqualTo("Tunis");
        assertThat(gov.get(0).get("orders").asLong()).isEqualTo(3);
        assertThat(gov).hasSize(3);

        JsonNode sources = a.get("sources");
        assertThat(sources.get(0).get("source").asText()).isEqualTo("tiktok");
        assertThat(sources.get(0).get("orders").asLong()).isEqualTo(3);
        assertThat(sources.get(2).get("source").isNull()).isTrue();

        JsonNode heat = a.get("heatmap");
        assertThat(heat).hasSize(5);
        // Lundi 6 janvier 10:00 et 21:30, mercredi 15 à 14:00, lundi 20 à 09:00, vendredi 31 à 23:30.
        assertThat(heat.get(0).get("weekday").asInt()).isEqualTo(1);
        assertThat(heat.get(0).get("hour").asInt()).isEqualTo(9);
        assertThat(heat.get(4).get("weekday").asInt()).isEqualTo(5);
        assertThat(heat.get(4).get("hour").asInt()).isEqualTo(23);
    }

    @Test
    void hourlyAndWeeklyBuckets() throws Exception {
        JsonNode day = getJson(range("2042-01-06", "2042-01-06"));
        assertThat(day.get("granularity").asText()).isEqualTo("hour");
        assertThat(day.get("series")).hasSize(24);
        assertThat(day.get("series").get(10).get("orders").asLong()).isEqualTo(1);
        assertThat(day.get("series").get(21).get("orders").asLong()).isEqualTo(1);
        assertThat(day.get("previousFrom").asText()).isEqualTo("2042-01-05");
        assertThat(day.get("previousTo").asText()).isEqualTo("2042-01-05");

        Map<String, String> weeks = range("2042-01-06", "2042-01-19");
        weeks.put("granularity", "week");
        JsonNode w = getJson(weeks);
        assertThat(w.get("series")).hasSize(2);
        assertThat(w.get("series").get(0).get("start").asText()).startsWith("2042-01-06");
        assertThat(w.get("series").get(0).get("orders").asLong()).isEqualTo(2);
        assertThat(w.get("series").get(1).get("orders").asLong()).isEqualTo(1);
        // 14 jours hors mois entiers : la comparaison est les 14 jours précédents.
        assertThat(w.get("previousFrom").asText()).isEqualTo("2041-12-23");
        assertThat(w.get("previousTo").asText()).isEqualTo("2042-01-05");

        Map<String, String> year = range("2042-01-01", "2042-12-31");
        JsonNode y = getJson(year);
        assertThat(y.get("granularity").asText()).isEqualTo("month");
        assertThat(y.get("series")).hasSize(12);
        assertThat(y.get("series").get(0).get("orders").asLong()).isEqualTo(5);
        assertThat(y.get("previousFrom").asText()).isEqualTo("2041-01-01");
    }

    @Test
    void explicitComparisonWindowOnlyChangesTheSummary() throws Exception {
        // Janvier « jusqu'au 10 » comparé au 1er–10 décembre : seule SC-A6 (10 déc.) compte, pas SC-A7 (11 déc.).
        Map<String, String> params = range("2042-01-01", "2042-01-31");
        params.put("compareFrom", "2041-12-01");
        params.put("compareTo", "2041-12-10");
        JsonNode a = getJson(params);
        assertThat(a.get("compareFrom").asText()).isEqualTo("2041-12-01");
        assertThat(a.get("compareTo").asText()).isEqualTo("2041-12-10");
        assertThat(a.get("previous").get("orders").asLong()).isEqualTo(1);
        // La série de comparaison reste le mois précédent entier.
        assertThat(a.get("previousFrom").asText()).isEqualTo("2041-12-01");
        assertThat(a.get("previousSeries")).hasSize(31);
        assertThat(a.get("previousSeries").get(10).get("orders").asLong()).isEqualTo(1);

        Map<String, String> half = range("2042-01-01", "2042-01-31");
        half.put("compareFrom", "2041-12-01");
        mvc.perform(analytics(half)).andExpect(status().isBadRequest());
    }

    @Test
    void filtersByProduct() throws Exception {
        long setup = jdbc.queryForObject("select id from product where sku = 'PACK-SETUP'", Long.class);
        Map<String, String> params = range("2042-01-01", "2042-01-31");
        params.put("productId", String.valueOf(setup));
        JsonNode a = getJson(params);
        assertThat(a.get("summary").get("orders").asLong()).isEqualTo(1);
        assertThat(a.get("summary").get("revenueTnd").decimalValue()).isEqualByComparingTo("79");
        assertThat(a.get("products")).hasSize(1);
        assertThat(a.get("series").get(5).get("orders").asLong()).isEqualTo(1);
    }

    @Test
    void invalidRangesAre400() throws Exception {
        mvc.perform(analytics(range("2042-01-31", "2042-01-01"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"));
        mvc.perform(analytics(range("janvier", "2042-01-01"))).andExpect(status().isBadRequest());
        Map<String, String> tooManyHours = range("2042-01-01", "2042-01-31");
        tooManyHours.put("granularity", "hour");
        mvc.perform(analytics(tooManyHours)).andExpect(status().isBadRequest());
        Map<String, String> badUnit = range("2042-01-01", "2042-01-31");
        badUnit.put("granularity", "decade");
        mvc.perform(analytics(badUnit)).andExpect(status().isBadRequest());
        mvc.perform(analytics(range("2020-01-01", "2042-01-01"))).andExpect(status().isBadRequest());
        // Sans paramètre : les 30 derniers jours, découpés par jour.
        mvc.perform(analytics(Map.of())).andExpect(status().isOk())
                .andExpect(jsonPath("$.granularity").value("day"))
                .andExpect(jsonPath("$.series.length()").value(30));
    }

    @Test
    void requiresAdmin() throws Exception {
        mvc.perform(get("/api/admin/stats/analytics")).andExpect(status().isUnauthorized());
    }
}
