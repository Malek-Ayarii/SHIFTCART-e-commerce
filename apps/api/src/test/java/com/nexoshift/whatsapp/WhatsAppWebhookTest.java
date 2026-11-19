package com.nexoshift.whatsapp;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nexoshift.IntegrationTest;
import com.nexoshift.common.security.Hashing;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

class WhatsAppWebhookTest extends IntegrationTest {

    private static final String APP_SECRET = "test-app-secret";

    @Test
    void verifyEchoesChallengeOnlyWithTheRightToken() throws Exception {
        mvc.perform(get("/api/webhooks/whatsapp").param("hub.mode", "subscribe")
                        .param("hub.verify_token", "test-verify-token").param("hub.challenge", "1158201444"))
                .andExpect(status().isOk())
                .andExpect(content().string("1158201444"));
        mvc.perform(get("/api/webhooks/whatsapp").param("hub.mode", "subscribe")
                        .param("hub.verify_token", "wrong").param("hub.challenge", "1158201444"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectsMissingOrBadSignature() throws Exception {
        String body = payload("21699999999", "wamid.bad", "OUI");
        mvc.perform(post("/api/webhooks/whatsapp").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/webhooks/whatsapp").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header("X-Hub-Signature-256", "sha256=" + "0".repeat(64)))
                .andExpect(status().isForbidden());
    }

    @Test
    void ouiConfirmsTheLatestNewOrderAndSendsRecap() throws Exception {
        String phone = freshPhone();
        String ref = createOrder(phone).get("ref").asText();
        long id = orderId(ref);

        send(payload("216" + phone, "wamid.oui-" + phone, "Oui 👍")).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("select status from customer_order where id = ?", String.class, id))
                .isEqualTo("CONFIRMED");
        assertThat(jdbc.queryForObject("select confirmed_at is not null from customer_order where id = ?",
                Boolean.class, id)).isTrue();
        assertThat(jdbc.queryForObject(
                "select actor from order_event where order_id = ? and to_status = 'CONFIRMED'", String.class, id))
                .isEqualTo("system");
        List<Map<String, Object>> messages = jdbc.queryForList(
                "select direction, status, body from message where order_id = ? order by id", id);
        assertThat(messages).hasSize(2);
        assertThat(messages.get(0)).containsEntry("direction", "IN").containsEntry("status", "RECEIVED")
                .containsEntry("body", "Oui 👍");
        assertThat(messages.get(1)).containsEntry("direction", "OUT").containsEntry("status", "SIMULATED");
        assertThat((String) messages.get(1).get("body")).contains("Mohamed").contains("/suivi/" + ref + "?t=");

        // La même notification renvoyée par Meta n'est pas traitée deux fois.
        send(payload("216" + phone, "wamid.oui-" + phone, "Oui 👍")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select count(*) from message where order_id = ?", Integer.class, id))
                .isEqualTo(2);
    }

    @Test
    void prefilledConfirmationTextConfirmsTheCitedOrder() throws Exception {
        String phone = freshPhone();
        String ref = createOrder(phone).get("ref").asText();
        send(payload("216" + phone, "wamid.prefill-" + phone, "Je confirme ma commande " + ref))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select status from customer_order where ref = ?", String.class, ref))
                .isEqualTo("CONFIRMED");
    }

    @Test
    void otherMessagesAreStoredWithoutChangingStatus() throws Exception {
        String phone = freshPhone();
        String ref = createOrder(phone).get("ref").asText();
        long id = orderId(ref);
        send(payload("216" + phone, "wamid.q-" + phone, "C'est quoi le délai de livraison ?")).andExpect(status().isOk());
        send(payload("216" + phone, "wamid.n-" + phone, "Non merci, annulez")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("select status from customer_order where id = ?", String.class, id))
                .isEqualTo("NEW");
        assertThat(jdbc.queryForObject("select count(*) from message where order_id = ? and direction = 'IN'",
                Integer.class, id)).isEqualTo(2);
    }

    @Test
    void messageFromUnknownNumberIsStoredUnlinked() throws Exception {
        send(payload("21655000111", "wamid.unknown", "OUI")).andExpect(status().isOk());
        assertThat(jdbc.queryForObject(
                "select count(*) from message where phone_e164 = '+21655000111' and order_id is null", Integer.class))
                .isEqualTo(1);
    }

    private ResultActions send(String body) throws Exception {
        String signature = "sha256=" + Hashing.hmacSha256Hex(APP_SECRET, body.getBytes(StandardCharsets.UTF_8));
        return mvc.perform(post("/api/webhooks/whatsapp").contentType(MediaType.APPLICATION_JSON)
                .content(body.getBytes(StandardCharsets.UTF_8))
                .header("X-Hub-Signature-256", signature));
    }

    private String payload(String from, String wamid, String text) throws Exception {
        Map<String, Object> message = Map.of("from", from, "id", wamid, "timestamp", "1794650000", "type", "text",
                "text", Map.of("body", text));
        Map<String, Object> value = Map.of("messaging_product", "whatsapp",
                "metadata", Map.of("display_phone_number", "21612345678", "phone_number_id", "123"),
                "contacts", List.of(Map.of("profile", Map.of("name", "Client"), "wa_id", from)),
                "messages", List.of(message));
        return json(Map.of("object", "whatsapp_business_account",
                "entry", List.of(Map.of("id", "WABA", "changes", List.of(Map.of("field", "messages", "value", value))))));
    }
}
