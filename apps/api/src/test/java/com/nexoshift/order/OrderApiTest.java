package com.nexoshift.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.nexoshift.IntegrationTest;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

class OrderApiTest extends IntegrationTest {

    @Test
    void createsOrderWith201AndContractShape() throws Exception {
        String phone = freshPhone();
        MvcResult r = mvc.perform(orderRequest(validOrder(phone), freshIp()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.amountTnd").value(89))
                .andExpect(jsonPath("$.productName").value("Le Pack Barista"))
                .andExpect(jsonPath("$.productSlug").value("pack-barista"))
                .andExpect(jsonPath("$.productCoverUrl").value(org.hamcrest.Matchers.matchesPattern("/api/media/\\d+")))
                .andExpect(jsonPath("$.customerFirstName").value("Mohamed"))
                .andExpect(jsonPath("$.governorate").value("Sousse"))
                .andExpect(jsonPath("$.address").doesNotExist())
                .andReturn();
        String raw = r.getResponse().getContentAsString();
        assertThat(raw).contains("\"amountTnd\":89,");
        JsonNode body = body(r);
        String ref = body.get("ref").asText();
        assertThat(ref).matches("SC-\\d{4,}");
        assertThat(Integer.parseInt(ref.substring(3))).isGreaterThanOrEqualTo(2951);
        assertThat(body.get("phoneDisplay").asText())
                .isEqualTo("+216 " + phone.substring(0, 2) + " " + phone.substring(2, 5) + " " + phone.substring(5));
        String token = body.get("trackingToken").asText();
        assertThat(body.get("whatsappConfirmUrl").asText())
                .isEqualTo("https://wa.me/21612345678?text=Je%20confirme%20ma%20commande%20" + ref);
        assertThat(body.get("trackingUrl").asText()).isEqualTo("http://localhost:3000/suivi/" + ref + "?t=" + token);
        assertThat(body.get("trackingUrl").asText()).doesNotContain(phone);

        Map<String, Object> row = jdbc.queryForMap(
                "select phone_e164, status, amount_millimes, utm_source, tracking_token_hash from customer_order where ref = ?",
                ref);
        assertThat(row.get("phone_e164")).isEqualTo("+216" + phone);
        assertThat(row.get("amount_millimes")).isEqualTo(89000L);
        assertThat(row.get("utm_source")).isEqualTo("tiktok");
        assertThat((String) row.get("tracking_token_hash")).hasSize(64).isNotEqualTo(token);
        Integer events = jdbc.queryForObject(
                "select count(*) from order_event where order_id = ? and to_status = 'NEW' and actor = 'customer'",
                Integer.class, orderId(ref));
        assertThat(events).isEqualTo(1);
    }

    @Test
    void acceptsPhoneWithSpaces() throws Exception {
        String phone = freshPhone();
        Map<String, Object> payload = new HashMap<>(validOrder(phone));
        payload.put("phone", phone.substring(0, 2) + " " + phone.substring(2, 5) + " " + phone.substring(5));
        mvc.perform(orderRequest(payload, freshIp())).andExpect(status().isCreated());
    }

    @Test
    void validationErrorsUseExactFrenchMessages() throws Exception {
        expect422(Map.of("customerName", "  "), "customerName", "Ton nom aide le livreur à te trouver.");
        expect422(Map.of("customerName", "Mo"), "customerName", "Écris ton nom et ton prénom.");
        expect422(Map.of("customerName", "x".repeat(81)), "customerName", "Écris ton nom et ton prénom.");
        expect422(Map.of("phone", ""), "phone", "Ton numéro nous sert à confirmer la commande sur WhatsApp.");
        expect422(Map.of("phone", "9876543"), "phone", "Il manque 1 chiffre (8 au total).");
        expect422(Map.of("phone", "98 76"), "phone", "Il manque 4 chiffres (8 au total).");
        expect422(Map.of("phone", "18765432"), "phone", "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.");
        expect422(Map.of("phone", "68765432"), "phone", "Un numéro tunisien commence par 2, 3, 4, 5, 7 ou 9.");
        expect422(Map.of("governorate", ""), "governorate", "Choisis où te livrer.");
        expect422(Map.of("governorate", "Beja"), "governorate", "Choisis où te livrer.");
    }

    @Test
    void reportsAllFieldErrorsTogether() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("productSku", "PACK-BARISTA");
        payload.put("quantity", 1);
        mvc.perform(orderRequest(payload, freshIp()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.customerName").value("Ton nom aide le livreur à te trouver."))
                .andExpect(jsonPath("$.errors.phone").value("Ton numéro nous sert à confirmer la commande sur WhatsApp."))
                .andExpect(jsonPath("$.errors.governorate").value("Choisis où te livrer."))
                .andExpect(jsonPath("$.errors.address").value("Ton adresse permet au livreur de te trouver."));
    }

    @Test
    void acceptsEveryGovernorateWithAccents() throws Exception {
        for (String gov : new String[] {"Béja", "Gabès", "Kébili", "Médenine", "La Manouba", "Le Kef"}) {
            rateLimiters.resetAll();
            Map<String, Object> payload = new HashMap<>(validOrder(freshPhone()));
            payload.put("governorate", gov);
            mvc.perform(orderRequest(payload, freshIp())).andExpect(status().isCreated());
        }
    }

    @Test
    void honeypotReturnsFakeRefAndStoresNothing() throws Exception {
        String phone = freshPhone();
        Map<String, Object> payload = new HashMap<>(validOrder(phone));
        payload.put("website", "http://spam.example");
        mvc.perform(orderRequest(payload, freshIp()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ref").value("SC-0000"));
        Integer count = jdbc.queryForObject("select count(*) from customer_order where phone_e164 = ?",
                Integer.class, "+216" + phone);
        assertThat(count).isZero();
    }

    @Test
    void duplicateWithin30MinutesReturns200WithExistingOrder() throws Exception {
        String phone = freshPhone();
        JsonNode first = createOrder(phone);
        mvc.perform(orderRequest(validOrder(phone), freshIp()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ref").value(first.get("ref").asText()))
                .andExpect(jsonPath("$.trackingToken").value(first.get("trackingToken").asText()));
        Integer count = jdbc.queryForObject("select count(*) from customer_order where phone_e164 = ?",
                Integer.class, "+216" + phone);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void concurrentDoubleSubmitCreatesOnlyOneOrder() throws Exception {
        String phone = freshPhone();
        int n = 4;
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(n);
        java.util.concurrent.CountDownLatch start = new java.util.concurrent.CountDownLatch(1);
        java.util.List<java.util.concurrent.Future<String>> results = new java.util.ArrayList<>();
        try {
            for (int i = 0; i < n; i++) {
                String ip = freshIp();
                results.add(pool.submit(() -> {
                    start.await();
                    return body(mvc.perform(orderRequest(validOrder(phone), ip)).andReturn()).get("ref").asText();
                }));
            }
            start.countDown();
            java.util.Set<String> refs = new java.util.HashSet<>();
            for (java.util.concurrent.Future<String> f : results) {
                refs.add(f.get(30, java.util.concurrent.TimeUnit.SECONDS));
            }
            assertThat(refs).hasSize(1);
        } finally {
            pool.shutdownNow();
        }
        assertThat(jdbc.queryForObject("select count(*) from customer_order where phone_e164 = ?", Integer.class,
                "+216" + phone)).isEqualTo(1);
    }

    @Test
    void rateLimitsPerIpWith429() throws Exception {
        String ip = freshIp();
        for (int i = 0; i < 5; i++) {
            mvc.perform(orderRequest(validOrder(freshPhone()), ip)).andExpect(status().isCreated());
        }
        mvc.perform(orderRequest(validOrder(freshPhone()), ip))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("RATE_LIMITED"))
                .andExpect(jsonPath("$.message").value("Trop de tentatives. Réessaie dans quelques minutes."));
    }

    @Test
    void rateLimitsPerPhoneWith429() throws Exception {
        String phone = freshPhone();
        // Le doublon renvoie la commande existante : on annule entre deux essais pour forcer une création.
        for (int i = 0; i < 3; i++) {
            JsonNode created = createOrder(phone);
            jdbc.update("update customer_order set status = 'CANCELLED' where ref = ?", created.get("ref").asText());
        }
        mvc.perform(orderRequest(validOrder(phone), freshIp()))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("RATE_LIMITED"));
    }

    @Test
    void unknownOrInactivePackIs422() throws Exception {
        expect422(Map.of("productSku", "NOPE"), "productSku", "Ce pack n'est plus disponible.");
        // Un pack désactivé (brouillon) ne peut plus être commandé.
        jdbc.update("update product set active = false where sku = 'PACK-MEALPREP'");
        try {
            expect422(Map.of("productSku", "PACK-MEALPREP"), "productSku", "Ce pack n'est plus disponible.");
        } finally {
            jdbc.update("update product set active = true where sku = 'PACK-MEALPREP'");
        }
    }

    @Test
    void addressValidationUsesExactMessages() throws Exception {
        expect422(Map.of("address", ""), "address", "Ton adresse permet au livreur de te trouver.");
        expect422(Map.of("address", "   "), "address", "Ton adresse permet au livreur de te trouver.");
        expect422(Map.of("address", "  Tunis  "), "address", "Précise ta rue, ton quartier et ta ville.");
        expect422(Map.of("address", "x".repeat(201)), "address", "Ton adresse est trop longue (200 caractères max).");
        // Longue de 10 seulement grâce aux espaces / caractères de contrôle : validée sur la forme enregistrée.
        expect422(Map.of("address", "Tunis\n\n\n\t\u0000 x"), "address", "Précise ta rue, ton quartier et ta ville.");
        Map<String, Object> payload = new HashMap<>(validOrder(freshPhone()));
        payload.remove("address");
        mvc.perform(orderRequest(payload, freshIp()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors.address").value("Ton adresse permet au livreur de te trouver."));
    }

    @Test
    void storesTrimmedAddressAndFreezesPackPrice() throws Exception {
        String phone = freshPhone();
        Map<String, Object> payload = new HashMap<>(validOrder(phone));
        payload.put("productSku", "PACK-SETUP");
        payload.put("address", "  7 rue Ibn Khaldoun,\r\n\u0000 cité Erriadh,\tSousse  ");
        MvcResult r = mvc.perform(orderRequest(payload, freshIp()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amountTnd").value(79))
                .andExpect(jsonPath("$.productName").value("Le Pack Setup & Productivité"))
                .andExpect(jsonPath("$.productSlug").value("pack-setup-productivite"))
                .andExpect(jsonPath("$.productCoverUrl").isNotEmpty())
                .andReturn();
        String raw = r.getResponse().getContentAsString();
        assertThat(raw).doesNotContain("Ibn Khaldoun").doesNotContain("\"address\"");
        String ref = body(r).get("ref").asText();
        assertThat(jdbc.queryForObject("select address from customer_order where ref = ?", String.class, ref))
                .isEqualTo("7 rue Ibn Khaldoun, cité Erriadh, Sousse");
        // Le prix change ensuite : la commande garde le montant du moment.
        jdbc.update("update product set price_millimes = 99000 where sku = 'PACK-SETUP'");
        try {
            assertThat(jdbc.queryForObject("select amount_millimes from customer_order where ref = ?", Long.class, ref))
                    .isEqualTo(79000L);
        } finally {
            jdbc.update("update product set price_millimes = 79000 where sku = 'PACK-SETUP'");
        }
    }

    @Test
    void trackingWithValidTokenHidesPhoneAndFullName() throws Exception {
        String phone = freshPhone();
        JsonNode created = createOrder(phone);
        String ref = created.get("ref").asText();
        MvcResult r = mvc.perform(get("/api/orders/{ref}/tracking", ref).param("t", created.get("trackingToken").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ref").value(ref))
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.customerFirstName").value("Mohamed"))
                .andExpect(jsonPath("$.amountTnd").value(89))
                .andExpect(jsonPath("$.carrier").isEmpty())
                .andExpect(jsonPath("$.eta").isNotEmpty())
                .andExpect(jsonPath("$.steps.length()").value(4))
                .andExpect(jsonPath("$.steps[0].key").value("RECEIVED"))
                .andExpect(jsonPath("$.steps[0].label").value("Commande reçue"))
                .andExpect(jsonPath("$.steps[0].state").value("current"))
                .andExpect(jsonPath("$.steps[1].label").value("Confirmée sur WhatsApp"))
                .andExpect(jsonPath("$.steps[1].state").value("upcoming"))
                .andExpect(jsonPath("$.steps[3].label").value("Livrée & payée"))
                .andExpect(jsonPath("$.productSlug").value("pack-barista"))
                .andExpect(jsonPath("$.productCoverUrl").value(org.hamcrest.Matchers.startsWith("/api/media/")))
                .andExpect(jsonPath("$.address").doesNotExist())
                .andReturn();
        String raw = r.getResponse().getContentAsString();
        assertThat(raw).doesNotContain(phone).doesNotContain("Ben Ali").doesNotContain("Marseille");
    }

    @Test
    void trackingShowsCarrierAndTrackingNumberOnceShipped() throws Exception {
        JsonNode created = createOrder(freshPhone());
        String ref = created.get("ref").asText();
        long id = orderId(ref);
        jdbc.update("update customer_order set status = 'SHIPPED', confirmed_at = now(), shipped_at = now(), "
                + "carrier = 'YALIDINE', tracking_number = 'YAL-88213' where id = ?", id);
        mvc.perform(get("/api/orders/{ref}/tracking", ref).param("t", created.get("trackingToken").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.carrier").value("YALIDINE"))
                .andExpect(jsonPath("$.trackingNumber").value("YAL-88213"))
                .andExpect(jsonPath("$.steps[1].state").value("done"))
                .andExpect(jsonPath("$.steps[2].label").value("Expédiée avec Yalidine"))
                .andExpect(jsonPath("$.steps[2].state").value("current"))
                .andExpect(jsonPath("$.steps[2].detail").value("N° de suivi YAL-88213"))
                .andExpect(jsonPath("$.steps[3].state").value("upcoming"))
                .andExpect(jsonPath("$.steps[3].at").isEmpty());
    }

    @Test
    void trackingWithInvalidTokenIs403AndUnknownRefIs404() throws Exception {
        JsonNode created = createOrder(freshPhone());
        String ref = created.get("ref").asText();
        mvc.perform(get("/api/orders/{ref}/tracking", ref).param("t", "forged"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("FORBIDDEN"));
        mvc.perform(get("/api/orders/{ref}/tracking", ref))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/orders/{ref}/tracking", "SC-999999").param("t", "x"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"));
    }

    private void expect422(Map<String, Object> override, String field, String message) throws Exception {
        Map<String, Object> payload = new HashMap<>(validOrder(freshPhone()));
        payload.putAll(override);
        mvc.perform(orderRequest(payload, freshIp()))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errors." + field).value(message));
    }
}
