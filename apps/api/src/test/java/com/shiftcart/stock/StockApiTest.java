package com.shiftcart.stock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftcart.IntegrationTest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

class StockApiTest extends IntegrationTest {

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = adminToken();
        // Valeurs des maquettes : 22 + 11 + 6 + 2,5 = 41,5 TND de COGS.
        jdbc.update("update stock_item set unit_cost_millimes = 22000, quantity = 12, threshold = 10 where sort_order = 1");
        jdbc.update("update stock_item set unit_cost_millimes = 11000, quantity = 9, threshold = 10 where sort_order = 2");
        jdbc.update("update stock_item set unit_cost_millimes = 6000, quantity = 25, threshold = 10 where sort_order = 3");
        jdbc.update("update stock_item set unit_cost_millimes = 2500, quantity = 30, threshold = 10 where sort_order = 4");
        jdbc.update("update product set assembled_stock = 3 where sku = 'PACK-BARISTA'");
    }

    @Test
    void getMatchesContractExample() throws Exception {
        String raw = mvc.perform(get("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(4))
                .andExpect(jsonPath("$.items[0].name").value("Cafetière italienne Moka"))
                .andExpect(jsonPath("$.items[0].unitCostTnd").value(22))
                .andExpect(jsonPath("$.items[0].perPack").value(1))
                .andExpect(jsonPath("$.items[0].status").value("OK"))
                .andExpect(jsonPath("$.items[1].status").value("LOW"))
                .andExpect(jsonPath("$.completePacks").value(3))
                .andExpect(jsonPath("$.packThreshold").value(5))
                .andExpect(jsonPath("$.alert").value(true))
                .andExpect(jsonPath("$.assemblablePacks").value(9))
                .andExpect(jsonPath("$.packPriceTnd").value(89))
                .andExpect(jsonPath("$.cogsTnd").value(41.5))
                .andExpect(jsonPath("$.carrierFeeTnd").value(7))
                .andExpect(jsonPath("$.marginTnd").value(40.5))
                .andExpect(jsonPath("$.marginPct").value(45.5))
                .andReturn().getResponse().getContentAsString();
        assertThat(raw).contains("\"cogsTnd\":41.5").contains("\"packPriceTnd\":89,");
    }

    @Test
    void patchUpdatesItems() throws Exception {
        JsonNode stock = body(mvc.perform(get("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andReturn());
        long thermosId = stock.get("items").get(1).get("id").asLong();
        mvc.perform(patch("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("items", List.of(
                                Map.of("id", thermosId, "quantity", 20, "unitCostTnd", 12.5, "threshold", 5))))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[1].quantity").value(20))
                .andExpect(jsonPath("$.items[1].unitCostTnd").value(12.5))
                .andExpect(jsonPath("$.items[1].status").value("OK"))
                .andExpect(jsonPath("$.assemblablePacks").value(12))
                .andExpect(jsonPath("$.cogsTnd").value(43));

        List<Map<String, Object>> bad = new ArrayList<>();
        bad.add(Map.of("id", thermosId, "quantity", -1));
        mvc.perform(patch("/api/admin/stock").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("items", bad))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors['items[0].quantity']").isNotEmpty());
    }

    @Test
    void assembleConsumesPartsAndRefusesWhenShort() throws Exception {
        mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("packs", 5))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completePacks").value(8))
                .andExpect(jsonPath("$.alert").value(false))
                .andExpect(jsonPath("$.items[0].quantity").value(7))
                .andExpect(jsonPath("$.items[1].quantity").value(4))
                .andExpect(jsonPath("$.assemblablePacks").value(4));

        mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("packs", 5))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INSUFFICIENT_STOCK"));
        assertThat(jdbc.queryForObject("select assembled_stock from product where sku = 'PACK-BARISTA'", Integer.class))
                .isEqualTo(8);

        mvc.perform(post("/api/admin/stock/assemble").header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("packs", 0))))
                .andExpect(status().isUnprocessableEntity());
    }
}
