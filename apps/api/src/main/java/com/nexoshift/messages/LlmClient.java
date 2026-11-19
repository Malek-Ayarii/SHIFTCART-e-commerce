package com.nexoshift.messages;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.nexoshift.common.config.AppProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Appel minimal à l'API Anthropic Messages ({@code POST /v1/messages}) avec {@code java.net.http}.
 * Renvoie {@link Optional#empty()} si la clé est absente, en cas d'erreur ou de délai dépassé (10 s par
 * défaut) : l'appelant retombe alors sur les gabarits déterministes.
 */
@Component
public class LlmClient {

    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);
    static final String ANTHROPIC_VERSION = "2023-06-01";

    private final AppProperties props;
    private final HttpClient http;
    private final ObjectMapper mapper;

    public LlmClient(AppProperties props, HttpClient http, ObjectMapper mapper) {
        this.props = props;
        this.http = http;
        this.mapper = mapper;
    }

    public boolean isConfigured() {
        return props.llm().configured();
    }

    public Optional<String> complete(String system, String userPrompt) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        AppProperties.Llm llm = props.llm();
        ObjectNode payload = mapper.createObjectNode();
        payload.put("model", llm.model());
        payload.put("max_tokens", 300);
        payload.put("system", system);
        ObjectNode msg = payload.putArray("messages").addObject();
        msg.put("role", "user");
        msg.put("content", userPrompt);
        try {
            HttpRequest request = HttpRequest.newBuilder(
                            URI.create(llm.baseUrl().replaceAll("/+$", "") + "/v1/messages"))
                    .timeout(llm.timeout())
                    .header("x-api-key", llm.apiKey())
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .header("content-type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload)))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                log.warn("LLM call failed: HTTP {} (falling back to templates)", response.statusCode());
                return Optional.empty();
            }
            JsonNode json = mapper.readTree(response.body());
            StringBuilder text = new StringBuilder();
            for (JsonNode block : json.path("content")) {
                if ("text".equals(block.path("type").asText())) {
                    text.append(block.path("text").asText());
                }
            }
            String result = text.toString().trim();
            return result.isEmpty() ? Optional.empty() : Optional.of(result);
        } catch (IOException e) {
            log.warn("LLM call error ({}): falling back to templates", e.getClass().getSimpleName());
            return Optional.empty();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }
}
