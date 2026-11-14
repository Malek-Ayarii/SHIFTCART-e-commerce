package com.shiftcart.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.shiftcart.IntegrationTest;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

class AdminOrderApiTest extends IntegrationTest {

    private String token;

    @BeforeEach
    void login() throws Exception {
        token = adminToken();
    }

    private ResultActions patchStatus(long id, Map<String, Object> body) throws Exception {
        return mvc.perform(patch("/api/admin/orders/{id}/status", id)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))
                .contentType(MediaType.APPLICATION_JSON).content(json(body)));
    }

    @Test
    void detailHasContractShape() throws Exception {
        String phone = freshPhone();
        String ref = createOrder(phone).get("ref").asText();
        long id = orderId(ref);
        mvc.perform(get("/api/admin/orders/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.ref").value(ref))
                .andExpect(jsonPath("$.customerName").value("Mohamed Ben Ali"))
                .andExpect(jsonPath("$.phone").value(
                        "+216 " + phone.substring(0, 2) + " " + phone.substring(2, 5) + " " + phone.substring(5)))
                .andExpect(jsonPath("$.productName").value("Le Pack Barista"))
                .andExpect(jsonPath("$.productSku").value("PACK-BARISTA"))
                .andExpect(jsonPath("$.amountTnd").value(89))
                .andExpect(jsonPath("$.quantity").value(1))
                .andExpect(jsonPath("$.source").value("tiktok / nov / reel-3"))
                .andExpect(jsonPath("$.carrier").isEmpty())
                .andExpect(jsonPath("$.confirmedAt").isEmpty())
                .andExpect(jsonPath("$.events[0].fromStatus").isEmpty())
                .andExpect(jsonPath("$.events[0].toStatus").value("NEW"))
                .andExpect(jsonPath("$.events[0].actor").value("customer"))
                .andExpect(jsonPath("$.messages.length()").value(0))
                .andExpect(jsonPath("$.allowedTransitions[0]").value("CONFIRMED"))
                .andExpect(jsonPath("$.allowedTransitions[1]").value("PENDING"))
                .andExpect(jsonPath("$.allowedTransitions[2]").value("CANCELLED"));
        mvc.perform(get("/api/admin/orders/{id}", 999_999).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    @Test
    void fullLifecycleWithTimestampsEventsAndStock() throws Exception {
        long id = orderId(createOrder(freshPhone()).get("ref").asText());
        jdbc.update("update product set assembled_stock = 4 where sku = 'PACK-BARISTA'");

        patchStatus(id, Map.of("status", "CONFIRMED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.confirmedAt").isNotEmpty())
                .andExpect(jsonPath("$.allowedTransitions[0]").value("SHIPPED"));

        patchStatus(id, Map.of("status", "SHIPPED", "trackingNumber", "YAL-88213"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"))
                .andExpect(jsonPath("$.carrier").value("YALIDINE"))
                .andExpect(jsonPath("$.trackingNumber").value("YAL-88213"))
                .andExpect(jsonPath("$.shippedAt").isNotEmpty());
        assertThat(jdbc.queryForObject("select assembled_stock from product where sku = 'PACK-BARISTA'", Integer.class))
                .isEqualTo(3);

        MvcResult r = patchStatus(id, Map.of("status", "DELIVERED", "note", "Payé en espèces"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveredAt").isNotEmpty())
                .andExpect(jsonPath("$.allowedTransitions.length()").value(0))
                .andReturn();
        JsonNode events = body(r).get("events");
        assertThat(events).hasSize(4);
        JsonNode last = events.get(3);
        assertThat(last.get("fromStatus").asText()).isEqualTo("SHIPPED");
        assertThat(last.get("toStatus").asText()).isEqualTo("DELIVERED");
        assertThat(last.get("actor").asText()).startsWith("agent:");
        assertThat(last.get("note").asText()).isEqualTo("Payé en espèces");
    }

    @Test
    void shippingNeverDropsAssembledStockBelowZero() throws Exception {
        long id = orderId(createOrder(freshPhone()).get("ref").asText());
        jdbc.update("update product set assembled_stock = 0 where sku = 'PACK-BARISTA'");
        patchStatus(id, Map.of("status", "CONFIRMED")).andExpect(status().isOk());
        patchStatus(id, Map.of("status", "SHIPPED", "carrier", "Bosta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.carrier").value("BOSTA"));
        assertThat(jdbc.queryForObject("select assembled_stock from product where sku = 'PACK-BARISTA'", Integer.class))
                .isZero();
    }

    @Test
    void forbiddenTransitionIs409() throws Exception {
        long id = orderId(createOrder(freshPhone()).get("ref").asText());
        patchStatus(id, Map.of("status", "DELIVERED"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("INVALID_TRANSITION"))
                .andExpect(jsonPath("$.message").isNotEmpty());
        patchStatus(id, Map.of("status", "PENDING")).andExpect(status().isOk());
        patchStatus(id, Map.of("status", "PENDING")).andExpect(status().isConflict());
        patchStatus(id, Map.of("status", "CANCELLED")).andExpect(status().isOk())
                .andExpect(jsonPath("$.allowedTransitions.length()").value(0));
        patchStatus(id, Map.of("status", "CONFIRMED")).andExpect(status().isConflict());
        patchStatus(id, Map.of("status", "WHATEVER"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.status").isNotEmpty());
    }

    @Test
    void countsReturnEveryStatusKey() throws Exception {
        String month = java.time.YearMonth.now(java.time.ZoneId.of("Africa/Tunis")).toString();
        MvcResult before = mvc.perform(get("/api/admin/orders/counts").param("month", month)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode b = body(before);
        for (String s : new String[] {"NEW", "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "RETURNED", "CANCELLED"}) {
            assertThat(b.has(s)).as(s).isTrue();
        }
        createOrder(freshPhone());
        JsonNode after = body(mvc.perform(get("/api/admin/orders/counts").param("month", month)
                .header(HttpHeaders.AUTHORIZATION, bearer(token))).andReturn());
        assertThat(after.get("NEW").asLong()).isEqualTo(b.get("NEW").asLong() + 1);
        JsonNode empty = body(mvc.perform(get("/api/admin/orders/counts").param("month", "2001-01")
                .header(HttpHeaders.AUTHORIZATION, bearer(token))).andReturn());
        assertThat(empty.get("DELIVERED").asLong()).isZero();
    }

    @Test
    void listFiltersAndSearches() throws Exception {
        String phone = freshPhone();
        String ref = createOrder(phone).get("ref").asText();
        String num = ref.substring(3);
        createOrder(freshPhone());

        for (String q : new String[] {ref, "#" + num, num, "ben ali", phone.substring(2)}) {
            mvc.perform(get("/api/admin/orders").param("q", q).param("status", "NEW", "PENDING")
                            .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[?(@.ref == '" + ref + "')]").exists());
        }
        mvc.perform(get("/api/admin/orders").param("status", "DELIVERED").param("q", ref)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/admin/orders").param("size", "2").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.size").value(2))
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalPages").isNumber());
    }

    @Test
    void generateAndSendMessage() throws Exception {
        long id = orderId(createOrder(freshPhone()).get("ref").asText());
        for (String tone : new String[] {"amical", "direct", "relance"}) {
            MvcResult r = mvc.perform(post("/api/admin/orders/{id}/messages/generate", id)
                            .header(HttpHeaders.AUTHORIZATION, bearer(token))
                            .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("tone", tone))))
                    .andExpect(status().isOk())
                    .andReturn();
            String text = body(r).get("body").asText();
            assertThat(text).contains("Mohamed").contains("Pack Barista").contains("Sousse").contains("89")
                    .contains("OUI");
        }
        mvc.perform(post("/api/admin/orders/{id}/messages/generate", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("tone", "agressif"))))
                .andExpect(status().isUnprocessableEntity());

        mvc.perform(post("/api/admin/orders/{id}/messages/send", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("body", "Salut Mohamed ! Réponds OUI."))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.direction").value("OUT"))
                .andExpect(jsonPath("$.channel").value("whatsapp"))
                .andExpect(jsonPath("$.status").value("SIMULATED"))
                .andExpect(jsonPath("$.body").value("Salut Mohamed ! Réponds OUI."));
        mvc.perform(get("/api/admin/orders/{id}", id).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.messages.length()").value(1));
        mvc.perform(post("/api/admin/orders/{id}/messages/send", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("body", " "))))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void deliverySlipIsAPdf() throws Exception {
        long id = orderId(createOrder(freshPhone()).get("ref").asText());
        MvcResult r = mvc.perform(get("/api/admin/orders/{id}/delivery-slip.pdf", id)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(r.getResponse().getContentType()).startsWith("application/pdf");
        byte[] pdf = r.getResponse().getContentAsByteArray();
        assertThat(new String(pdf, 0, 5, java.nio.charset.StandardCharsets.US_ASCII)).isEqualTo("%PDF-");
        assertThat(pdf.length).isGreaterThan(1000);
    }
}
