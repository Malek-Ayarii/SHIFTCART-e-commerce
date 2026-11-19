package com.nexoshift.stats;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexoshift.IntegrationTest;
import java.sql.Timestamp;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;

/**
 * Formules des stats sur un jeu connu (mars 2030, comparé à février 2030 ; heure de Tunis = UTC+1).
 * Mars : 8 commandes (3 livrées, 1 retournée, 1 expédiée, 1 confirmée, 1 nouvelle, 1 annulée).
 */
class StatsApiTest extends IntegrationTest {

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
        // ref, statut, gouvernorat, créée (heure de Tunis), expédiée
        insert("SC-T1", "DELIVERED", "Tunis", "2030-03-02T10:00+01:00", "2030-03-03T10:00+01:00");
        insert("SC-T2", "DELIVERED", "Tunis", "2030-03-09T10:00+01:00", "2030-03-10T10:00+01:00");
        insert("SC-T3", "DELIVERED", "Sousse", "2030-03-30T10:00+01:00", "2030-03-31T10:00+01:00");
        insert("SC-T4", "RETURNED", "Tunis", "2030-03-15T10:00+01:00", "2030-03-16T10:00+01:00");
        insert("SC-T5", "SHIPPED", "Sfax", "2030-03-20T10:00+01:00", "2030-03-21T10:00+01:00");
        insert("SC-T6", "CONFIRMED", "Sousse", "2030-03-22T10:00+01:00", null);
        // 00:30 à Tunis le 1er mars = 23:30 UTC le 28 février : doit compter en mars.
        insert("SC-T7", "NEW", "Tunis", "2030-03-01T00:30+01:00", null);
        insert("SC-T8", "CANCELLED", "Sfax", "2030-03-05T10:00+01:00", null);
        // Février : livrée mais expédiée le 1er mars (compte comme colis de mars), une retournée, une nouvelle.
        insert("SC-T9", "DELIVERED", "Tunis", "2030-02-27T10:00+01:00", "2030-03-01T10:00+01:00");
        insert("SC-T10", "RETURNED", "Tunis", "2030-02-10T10:00+01:00", "2030-02-11T10:00+01:00");
        insert("SC-T11", "NEW", "Tunis", "2030-02-12T10:00+01:00", null);
        // Avril : deux packs (Barista 89, Setup 79) pour les filtres par pack.
        insert("SC-T12", "DELIVERED", "Tunis", "2030-04-02T10:00+01:00", "2030-04-03T10:00+01:00");
        insert("SC-T13", "DELIVERED", "Sfax", "2030-04-05T10:00+01:00", "2030-04-06T10:00+01:00", "PACK-SETUP");
        insert("SC-T14", "RETURNED", "Sfax", "2030-04-06T10:00+01:00", "2030-04-07T10:00+01:00", "PACK-SETUP");
        insert("SC-T15", "NEW", "Sousse", "2030-04-07T10:00+01:00", null, "PACK-SETUP");
    }

    private void insert(String ref, String status, String gov, String created, String shipped) {
        insert(ref, status, gov, created, shipped, "PACK-BARISTA");
    }

    private void insert(String ref, String status, String gov, String created, String shipped, String sku) {
        jdbc.update("""
                INSERT INTO customer_order (ref, product_id, quantity, amount_millimes, customer_name, phone_e164,
                    governorate, address, status, created_at, updated_at, shipped_at)
                SELECT ?, id, 1, price_millimes, 'Test Client', '+21690000000', ?, 'Adresse de test, Tunis', ?, ?, ?, ?
                FROM product WHERE sku = ?
                """, ref, gov, status, ts(created), ts(created), shipped == null ? null : ts(shipped), sku);
    }

    private static Timestamp ts(String iso) {
        return Timestamp.from(OffsetDateTime.parse(iso).toInstant());
    }

    private JsonNode getJson(String path, String month) throws Exception {
        return body(mvc.perform(get(path).param("month", month).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
    }

    @Test
    void kpis() throws Exception {
        JsonNode k = getJson("/api/admin/stats/kpis", "2030-03");
        assertThat(k.get("month").asText()).isEqualTo("2030-03");
        assertThat(k.get("orders").asLong()).isEqualTo(8);
        assertThat(k.get("ordersDeltaPct").asInt()).isEqualTo(167);
        assertThat(k.get("revenueTnd").decimalValue()).isEqualByComparingTo("623");
        assertThat(k.get("revenueDeltaPct").asInt()).isEqualTo(133);
        assertThat(k.get("returnRatePct").asInt()).isEqualTo(25);
        assertThat(k.get("returnRateDeltaPts").asInt()).isEqualTo(-25);
        Long toConfirm = jdbc.queryForObject(
                "select count(*) from customer_order where status in ('NEW','PENDING')", Long.class);
        assertThat(k.get("toConfirm").asLong()).isEqualTo(toConfirm);
    }

    @Test
    void kpisDeltasAreNullWithoutBase() throws Exception {
        JsonNode k = getJson("/api/admin/stats/kpis", "2030-02");
        assertThat(k.get("orders").asLong()).isEqualTo(3);
        assertThat(k.get("ordersDeltaPct").isNull()).isTrue();
        assertThat(k.get("revenueDeltaPct").isNull()).isTrue();
        assertThat(k.get("returnRateDeltaPts").isNull()).isTrue();
    }

    @Test
    void finance() throws Exception {
        JsonNode f = getJson("/api/admin/stats/finance", "2030-03");
        assertThat(f.get("orderedTnd").decimalValue()).isEqualByComparingTo("623");
        assertThat(f.get("collectedTnd").decimalValue()).isEqualByComparingTo("267");
        assertThat(f.get("collectionRatePct").asInt()).isEqualTo(43);
        assertThat(f.get("returnsTnd").decimalValue()).isEqualByComparingTo("89");
        assertThat(f.get("inProgressTnd").decimalValue()).isEqualByComparingTo("267");
        assertThat(f.get("shippedParcels").asLong()).isEqualTo(6);
        assertThat(f.get("carrierFeeTnd").decimalValue()).isEqualByComparingTo("7");
        assertThat(f.get("carrierFeesTnd").decimalValue()).isEqualByComparingTo("42");
        assertThat(f.get("netTnd").decimalValue()).isEqualByComparingTo("225");
        JsonNode weekly = f.get("weekly");
        assertThat(weekly).hasSize(5);
        String[][] expected = {{"S1", "178", "89"}, {"S2", "89", "89"}, {"S3", "178", "0"}, {"S4", "89", "0"},
                {"S5", "89", "89"}};
        for (int i = 0; i < 5; i++) {
            assertThat(weekly.get(i).get("label").asText()).isEqualTo(expected[i][0]);
            assertThat(weekly.get(i).get("orderedTnd").decimalValue()).isEqualByComparingTo(expected[i][1]);
            assertThat(weekly.get(i).get("collectedTnd").decimalValue()).isEqualByComparingTo(expected[i][2]);
        }
        assertThat(getJson("/api/admin/stats/finance", "2030-02").get("weekly")).hasSize(4);
    }

    @Test
    void governorates() throws Exception {
        JsonNode g = getJson("/api/admin/stats/governorates", "2030-03");
        assertThat(g).hasSize(3);
        assertThat(g.get(0).get("governorate").asText()).isEqualTo("Tunis");
        assertThat(g.get(0).get("orders").asLong()).isEqualTo(4);
        assertThat(g.get(0).get("delivered").asLong()).isEqualTo(2);
        assertThat(g.get(0).get("returned").asLong()).isEqualTo(1);
        assertThat(g.get(0).get("collectedTnd").decimalValue()).isEqualByComparingTo("178");
        assertThat(g.get(0).get("sharePct").asInt()).isEqualTo(50);
        assertThat(g.get(1).get("governorate").asText()).isEqualTo("Sfax");
        assertThat(g.get(2).get("governorate").asText()).isEqualTo("Sousse");
        assertThat(g.get(2).get("sharePct").asInt()).isEqualTo(25);
    }

    @Test
    void filtersByProductAndBreaksDownPerPack() throws Exception {
        long barista = jdbc.queryForObject("select id from product where sku = 'PACK-BARISTA'", Long.class);
        long setup = jdbc.queryForObject("select id from product where sku = 'PACK-SETUP'", Long.class);

        JsonNode all = getJson("/api/admin/stats/kpis", "2030-04");
        assertThat(all.get("orders").asLong()).isEqualTo(4);
        JsonNode k = body(mvc.perform(get("/api/admin/stats/kpis").param("month", "2030-04")
                .param("productId", String.valueOf(setup)).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertThat(k.get("orders").asLong()).isEqualTo(3);
        assertThat(k.get("revenueTnd").decimalValue()).isEqualByComparingTo("237");
        assertThat(k.get("returnRatePct").asInt()).isEqualTo(50);

        JsonNode f = body(mvc.perform(get("/api/admin/stats/finance").param("month", "2030-04")
                .param("productId", String.valueOf(barista)).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertThat(f.get("collectedTnd").decimalValue()).isEqualByComparingTo("89");
        assertThat(f.get("shippedParcels").asLong()).isEqualTo(1);

        JsonNode g = body(mvc.perform(get("/api/admin/stats/governorates").param("month", "2030-04")
                .param("productId", String.valueOf(setup)).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertThat(g).hasSize(2);
        assertThat(g.get(0).get("governorate").asText()).isEqualTo("Sfax");

        JsonNode p = getJson("/api/admin/stats/products", "2030-04");
        assertThat(p.get(0).get("productId").asLong()).isEqualTo(setup);
        assertThat(p.get(0).get("name").asText()).isEqualTo("Le Pack Setup & Productivité");
        assertThat(p.get(0).get("orders").asLong()).isEqualTo(3);
        assertThat(p.get(0).get("delivered").asLong()).isEqualTo(1);
        assertThat(p.get(0).get("returned").asLong()).isEqualTo(1);
        assertThat(p.get(0).get("collectedTnd").decimalValue()).isEqualByComparingTo("79");
        assertThat(p.get(0).get("sharePct").asInt()).isEqualTo(75);
        assertThat(p.get(0).get("orderedTnd").decimalValue()).isEqualByComparingTo("237");
        assertThat(p.get(1).get("productId").asLong()).isEqualTo(barista);
        assertThat(p.get(1).get("sharePct").asInt()).isEqualTo(25);
        // Les packs actifs sans commande apparaissent à 0 (Meal Prep est actif depuis V4).
        boolean hasMealPrep = false;
        for (JsonNode row : p) {
            hasMealPrep |= row.get("name").asText().contains("Meal Prep");
        }
        assertThat(hasMealPrep).isTrue();
    }

    @Test
    void dailyCoversEveryDayOfTheMonth() throws Exception {
        JsonNode d = getJson("/api/admin/stats/daily", "2030-03");
        assertThat(d).hasSize(31);
        // 00:30 le 1er mars à Tunis compte le 1er mars.
        assertThat(d.get(0).get("date").asText()).isEqualTo("2030-03-01");
        assertThat(d.get(0).get("orders").asLong()).isEqualTo(1);
        assertThat(d.get(0).get("orderedTnd").decimalValue()).isEqualByComparingTo("89");
        assertThat(d.get(2).get("orders").asLong()).isZero();
        // Annulée : comptée en commandes, pas dans le CA.
        assertThat(d.get(4).get("orders").asLong()).isEqualTo(1);
        assertThat(d.get(4).get("orderedTnd").decimalValue()).isEqualByComparingTo("0");
        long total = 0;
        for (JsonNode row : d) {
            total += row.get("orders").asLong();
        }
        assertThat(total).isEqualTo(8);
        assertThat(getJson("/api/admin/stats/daily", "2030-02")).hasSize(28);
    }

    @Test
    void calendarCoversTheWholeYearInTunisTime() throws Exception {
        JsonNode c = body(mvc.perform(get("/api/admin/stats/calendar").param("year", "2030")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertThat(c.get("year").asInt()).isEqualTo(2030);
        JsonNode days = c.get("days");
        assertThat(days).hasSize(365);
        // 1er mars 2030 = 60e jour ; SC-T7 (00:30 à Tunis) y compte.
        JsonNode mar1 = days.get(59);
        assertThat(mar1.get("date").asText()).isEqualTo("2030-03-01");
        assertThat(mar1.get("orders").asLong()).isEqualTo(1);
        JsonNode mar5 = days.get(63);
        assertThat(mar5.get("cancelled").asLong()).isEqualTo(1);
        assertThat(mar5.get("orderedTnd").decimalValue()).isEqualByComparingTo("0");
        long total = 0;
        long delivered = 0;
        for (JsonNode d : days) {
            total += d.get("orders").asLong();
            delivered += d.get("delivered").asLong();
        }
        assertThat(total).isEqualTo(15);
        assertThat(delivered).isEqualTo(6);
        mvc.perform(get("/api/admin/stats/calendar").param("year", "1999").header(HttpHeaders.AUTHORIZATION,
                bearer(token))).andExpect(status().isBadRequest());
    }

    @Test
    void ordersCanBeListedForOneDay() throws Exception {
        JsonNode page = body(mvc.perform(get("/api/admin/orders").param("day", "2030-03-01")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
        assertThat(page.get("totalElements").asLong()).isEqualTo(1);
        assertThat(page.get("content").get(0).get("ref").asText()).isEqualTo("SC-T7");
        mvc.perform(get("/api/admin/orders").param("day", "01/03/2030").header(HttpHeaders.AUTHORIZATION,
                bearer(token))).andExpect(status().isBadRequest());
    }

    @Test
    void badMonthIs400() throws Exception {
        mvc.perform(get("/api/admin/stats/kpis").param("month", "mars").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"));
        mvc.perform(get("/api/admin/stats/kpis").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.month").isNotEmpty());
    }
}
