package com.shiftcart.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.shiftcart.common.config.AppProperties;
import com.shiftcart.common.phone.TnPhone;
import com.shiftcart.messages.Message;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Client WhatsApp Business Cloud API : {@code POST {graph}/{version}/{phone-number-id}/messages}
 * avec {@code Authorization: Bearer WHATSAPP_TOKEN}.
 *
 * <ul>
 *   <li>{@link #sendText} : texte libre, autorisé seulement dans la fenêtre de 24 h ouverte par le dernier
 *       message du client.</li>
 *   <li>{@link #sendTemplate} : modèle pré-approuvé par Meta ({@code order_confirmation}, variables
 *       prénom, pack, gouvernorat, montant), obligatoire pour écrire en premier hors fenêtre.</li>
 * </ul>
 * Sans {@code WHATSAPP_TOKEN} / {@code WHATSAPP_PHONE_NUMBER_ID}, rien n'est envoyé : le résultat est
 * {@code SIMULATED}. Les numéros ne sont jamais logués en clair.
 */
@Component
public class WhatsAppClient {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppClient.class);

    private final AppProperties props;
    private final HttpClient http;
    private final ObjectMapper mapper;

    public WhatsAppClient(AppProperties props, HttpClient http, ObjectMapper mapper) {
        this.props = props;
        this.http = http;
        this.mapper = mapper;
    }

    /** Résultat d'un envoi : statut ({@code SENT | FAILED | SIMULATED}) et id WhatsApp ("wamid…"). */
    public record SendResult(String status, String providerMessageId) {
        public static SendResult simulated() {
            return new SendResult(Message.STATUS_SIMULATED, null);
        }

        public static SendResult failed() {
            return new SendResult(Message.STATUS_FAILED, null);
        }
    }

    public boolean isConfigured() {
        return props.whatsapp().sendingConfigured();
    }

    public SendResult sendText(String toE164, String body) {
        ObjectNode payload = base(toE164);
        payload.put("type", "text");
        ObjectNode text = payload.putObject("text");
        text.put("preview_url", true);
        text.put("body", body);
        return post(payload, toE164);
    }

    /** Modèle {@code order_confirmation} ; {@code params} dans l'ordre : prénom, pack, gouvernorat, montant. */
    public SendResult sendTemplate(String toE164, List<String> params) {
        ObjectNode payload = base(toE164);
        payload.put("type", "template");
        ObjectNode template = payload.putObject("template");
        template.put("name", props.whatsapp().templateName());
        template.putObject("language").put("code", props.whatsapp().templateLanguage());
        ArrayNode components = template.putArray("components");
        ObjectNode bodyComponent = components.addObject();
        bodyComponent.put("type", "body");
        ArrayNode parameters = bodyComponent.putArray("parameters");
        for (String p : params) {
            parameters.addObject().put("type", "text").put("text", p);
        }
        return post(payload, toE164);
    }

    private ObjectNode base(String toE164) {
        ObjectNode payload = mapper.createObjectNode();
        payload.put("messaging_product", "whatsapp");
        payload.put("recipient_type", "individual");
        payload.put("to", TnPhone.waId(toE164));
        return payload;
    }

    private SendResult post(ObjectNode payload, String toE164) {
        if (!isConfigured()) {
            log.info("WhatsApp not configured: {} message to {} SIMULATED", payload.get("type").asText(),
                    TnPhone.mask(toE164));
            return SendResult.simulated();
        }
        AppProperties.WhatsApp wa = props.whatsapp();
        String url = wa.graphBaseUrl().replaceAll("/+$", "") + "/" + wa.graphVersion() + "/" + wa.phoneNumberId()
                + "/messages";
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(wa.timeout())
                    .header("Authorization", "Bearer " + wa.token())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("WhatsApp send failed: HTTP {} for {}", response.statusCode(), TnPhone.mask(toE164));
                return SendResult.failed();
            }
            JsonNode json = mapper.readTree(response.body());
            String id = json.path("messages").path(0).path("id").asText(null);
            return new SendResult(Message.STATUS_SENT, id);
        } catch (IOException e) {
            log.warn("WhatsApp send error for {}: {}", TnPhone.mask(toE164), e.getClass().getSimpleName());
            return SendResult.failed();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return SendResult.failed();
        }
    }
}
