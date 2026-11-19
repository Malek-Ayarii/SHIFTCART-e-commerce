package com.shiftcart.stock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftcart.IntegrationTest;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class StockApiTest extends IntegrationTest {

    private String token;
    private long baristaId;
    private long setupId;

    @BeforeEach
    void setUp() throws Exception {
        token = adminToken();
        baristaId = jdbc.queryForObject("select id from product where sku = 'PACK-BARISTA'", Long.class);
        setupId = jdbc.queryForObject("select id from product where sku = 'PACK-SETUP'", Long.class);
        // Valeurs des maquettes : 22 + 11 + 6 = 39 TND de COGS pour le Barista (Moka, thermos, café offert).
        item("Cafetière italienne (Moka)", 22000, 12, 10);
        item("Thermos intelligent", 11000, 9, 10);
        item("Café local de spécialité 250 g", 6000, 25, 10);
        item("Support d'ordinateur pliable", 18000, 4, 5);
        item("Lampe LED d'écran", 12000, 6, 5);
        item("Lunettes anti-lumière bleue", 7000, 10, 5);
        jdbc.update("update product set assembled_stock = 3 where sku = 'PACK-BARISTA'");
        jdbc.update("update product set assembled_stock = 8 where sku = 'PACK-SETUP'");
        jdbc.update("update product set assembled_stock = 6 where sku = 'PACK-ESPACE'");
    }

    private void item(String name, long cost, int qty, int threshold) {
        assertThat(jdbc.update("update stock_item set unit_cost_millimes = ?, quantity = ?, threshold = ? where name = ?",
                cost, qty, threshold, name)).isEqualTo(1);
    }

    private JsonNode stock() throws Exception {
        return body(mvc.perform(get("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk()).andReturn());
    }

    private static JsonNode pack(JsonNode stock, long productId) {
        for (JsonNode p : stock.get("packs")) {
            if (p.get("productId").asLong() == productId) {
                return p;
            }
        }
        throw new AssertionError("pack " + productId + " missing");
    }

    private static JsonNode itemNamed(JsonNode stock, String name) {
        for (JsonNode i : stock.get("items")) {
            if (i.get("name").asText().equals(name)) {
                return i;
            }
        }
        throw new AssertionError("item " + name + " missing");
    }

    @Test
    void getHasPerPackFiguresItemsAndUsage() throws Exception {
        JsonNode s = stock();
        assertThat(s.get("carrierFeeTnd").decimalValue()).isEqualByComparingTo("7");

        JsonNode barista = pack(s, baristaId);
        assertThat(barista.get("name").asText()).isEqualTo("Le Pack Barista");
        assertThat(barista.get("slug").asText()).isEqualTo("pack-barista");
        assertThat(barista.get("active").asBoolean()).isTrue();
        assertThat(barista.get("cover").get("url").asText()).startsWith("/api/media/");
        assertThat(barista.get("completePacks").asInt()).isEqualTo(3);
        assertThat(barista.get("assemblablePacks").asInt()).isEqualTo(9);
        assertThat(barista.get("packThreshold").asInt()).isEqualTo(5);
        assertThat(barista.get("alert").asBoolean()).isTrue();
        assertThat(barista.get("priceTnd").decimalValue()).isEqualByComparingTo("89");
        assertThat(barista.get("cogsTnd").decimalValue()).isEqualByComparingTo("39");
        assertThat(barista.get("marginTnd").decimalValue()).isEqualByComparingTo("43");
        assertThat(barista.get("marginPct").decimalValue()).isEqualByComparingTo("48.3");

        JsonNode setup = pack(s, setupId);
        assertThat(setup.get("assemblablePacks").asInt()).isEqualTo(4);
        assertThat(setup.get("alert").asBoolean()).isFalse();
        // La photo du Pack Setup est amorcée depuis la mise en ligne du visuel (upstream).
        assertThat(setup.get("cover").get("url").asText()).startsWith("/api/media/");

        // Meal Prep actif (V4, 99 TND) à 0 pack complet → en alerte.
        JsonNode activeMealPrep = null;
        for (JsonNode p : s.get("packs")) {
            if (p.get("slug").asText().equals("pack-meal-prep")) {
                activeMealPrep = p;
            }
        }
        assertThat(activeMealPrep).isNotNull();
        assertThat(activeMealPrep.get("active").asBoolean()).isTrue();
        assertThat(activeMealPrep.get("priceTnd").decimalValue()).isEqualByComparingTo("99");

        // Un pack en brouillon n'est jamais en alerte, même à 0 pack complet.
        jdbc.update("update product set active = false where sku = 'PACK-MEALPREP'");
        JsonNode draftStock;
        try {
            draftStock = stock();
        } finally {
            jdbc.update("update product set active = true where sku = 'PACK-MEALPREP'");
        }
        JsonNode mealPrep = null;
        for (JsonNode p : draftStock.get("packs")) {
            if (p.get("slug").asText().equals("pack-meal-prep")) {
                mealPrep = p;
            }
        }
        assertThat(mealPrep).isNotNull();
        assertThat(mealPrep.get("active").asBoolean()).isFalse();
        assertThat(mealPrep.get("alert").asBoolean()).isFalse();

        assertThat(s.get("alert").asBoolean()).isTrue();

        JsonNode moka = itemNamed(s, "Cafetière italienne (Moka)");
        assertThat(moka.get("description").asText()).isEqualTo("Design premium en acier inoxydable noir mat.");
        assertThat(moka.get("photo").isNull()).isTrue();
        assertThat(moka.get("unitCostTnd").decimalValue()).isEqualByComparingTo("22");
        assertThat(moka.get("status").asText()).isEqualTo("OK");
        // Le Barista est en tête (ordre du catalogue) ; d'autres tests peuvent composer des packs avec la Moka.
        assertThat(moka.get("usedIn")).isNotEmpty();
        assertThat(moka.get("usedIn").get(0).get("productId").asLong()).isEqualTo(baristaId);
        assertThat(moka.get("usedIn").get(0).get("name").asText()).isEqualTo("Le Pack Barista");
        assertThat(moka.get("usedIn").get(0).get("perPack").asInt()).isEqualTo(1);
        assertThat(itemNamed(s, "Thermos intelligent").get("status").asText()).isEqualTo("LOW");
        assertThat(itemNamed(s, "Emballage").get("usedIn")).isEmpty();
    }

    @Test
    void globalAlertOnlyCountsActivePacks() throws Exception {
        jdbc.update("update product set assembled_stock = 50 where active");
        try {
            assertThat(stock().get("alert").asBoolean()).isFalse();
        } finally {
            jdbc.update("update product set assembled_stock = 3 where sku = 'PACK-BARISTA'");
        }
    }

    @Test
    void patchUpdatesItemsIncludingNamePhotoAndDescription() throws Exception {
        JsonNode s = stock();
        long thermosId = itemNamed(s, "Thermos intelligent").get("id").asLong();
        long mediaId = jdbc.queryForObject("select min(id) from media", Long.class);
        Map<String, Object> change = new HashMap<>();
        change.put("id", thermosId);
        change.put("quantity", 20);
        change.put("unitCostTnd", 12.5);
        change.put("threshold", 5);
        change.put("photoMediaId", mediaId);
        mvc.perform(patch("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("items", List.of(change)))))
                .andExpect(status().isOk());
        JsonNode after = stock();
        JsonNode thermos = itemNamed(after, "Thermos intelligent");
        assertThat(thermos.get("quantity").asInt()).isEqualTo(20);
        assertThat(thermos.get("unitCostTnd").decimalValue()).isEqualByComparingTo("12.5");
        assertThat(thermos.get("status").asText()).isEqualTo("OK");
        assertThat(thermos.get("photo").get("id").asLong()).isEqualTo(mediaId);
        assertThat(thermos.get("description").asText()).startsWith("Affichage LED");
        assertThat(pack(after, baristaId).get("assemblablePacks").asInt()).isEqualTo(12);
        assertThat(pack(after, baristaId).get("cogsTnd").decimalValue()).isEqualByComparingTo("40.5");

        // null explicite = retirer la photo ; champ absent = inchangé.
        Map<String, Object> remove = new HashMap<>();
        remove.put("id", thermosId);
        remove.put("photoMediaId", null);
        mvc.perform(patch("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("items", List.of(remove)))))
                .andExpect(status().isOk());
        JsonNode removed = itemNamed(stock(), "Thermos intelligent");
        assertThat(removed.get("photo").isNull()).isTrue();
        assertThat(removed.get("quantity").asInt()).isEqualTo(20);

        List<Map<String, Object>> bad = new ArrayList<>();
        bad.add(Map.of("id", thermosId, "quantity", -1));
        bad.add(Map.of("id", thermosId, "name", "Emballage"));
        bad.add(Map.of("id", thermosId, "photoMediaId", 999_999));
        mvc.perform(patch("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("items", bad))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors['items[0].quantity']").isNotEmpty())
                .andExpect(jsonPath("$.errors['items[1].name']").value("Une pièce porte déjà ce nom."))
                .andExpect(jsonPath("$.errors['items[2].photoMediaId']").value("Photo introuvable."));
    }

    @Test
    void createAndDeleteItems() throws Exception {
        String name = "Sac isotherme test " + System.nanoTime();
        JsonNode created = body(mvc.perform(post("/api/admin/stock/items").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", name, "description", "Pour tester.", "unitCostTnd", 4.5,
                                "quantity", 3, "threshold", 2))))
                .andExpect(status().isCreated()).andReturn());
        JsonNode item = itemNamed(created, name);
        assertThat(item.get("unitCostTnd").decimalValue()).isEqualByComparingTo("4.5");
        assertThat(item.get("usedIn")).isEmpty();

        mvc.perform(post("/api/admin/stock/items").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", name, "unitCostTnd", 1, "quantity", 1, "threshold", 1))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.name").value("Une pièce porte déjà ce nom."));

        mvc.perform(delete("/api/admin/stock/items/{id}", item.get("id").asLong())
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNoContent());
        long mokaId = itemNamed(stock(), "Cafetière italienne (Moka)").get("id").asLong();
        mvc.perform(delete("/api/admin/stock/items/{id}", mokaId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("ITEM_IN_USE"))
                .andExpect(jsonPath("$.message").value("Cette pièce est utilisée dans un pack."));
    }

    @Test
    void assembleIsPerPackAndRefusesWhenShort() throws Exception {
        JsonNode s = body(mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("productId", baristaId, "packs", 5))))
                .andExpect(status().isOk()).andReturn());
        assertThat(pack(s, baristaId).get("completePacks").asInt()).isEqualTo(8);
        assertThat(pack(s, baristaId).get("alert").asBoolean()).isFalse();
        assertThat(pack(s, baristaId).get("assemblablePacks").asInt()).isEqualTo(4);
        assertThat(itemNamed(s, "Cafetière italienne (Moka)").get("quantity").asInt()).isEqualTo(7);
        assertThat(itemNamed(s, "Thermos intelligent").get("quantity").asInt()).isEqualTo(4);
        // Les pièces d'un autre pack ne bougent pas.
        assertThat(itemNamed(s, "Support d'ordinateur pliable").get("quantity").asInt()).isEqualTo(4);
        assertThat(pack(s, setupId).get("completePacks").asInt()).isEqualTo(8);

        mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("productId", baristaId, "packs", 5))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INSUFFICIENT_STOCK"));
        assertThat(jdbc.queryForObject("select assembled_stock from product where sku = 'PACK-BARISTA'", Integer.class))
                .isEqualTo(8);

        mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("productId", setupId, "packs", 4))))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select assembled_stock from product where sku = 'PACK-SETUP'", Integer.class))
                .isEqualTo(12);

        mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("productId", baristaId, "packs", 0))))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("packs", 1))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.productId").isNotEmpty());
        mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("productId", 999_999, "packs", 1))))
                .andExpect(status().isNotFound());
    }
}
