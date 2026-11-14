package com.shiftcart;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shiftcart.common.ratelimit.RateLimiters;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Base des tests d'intégration : contexte complet + Postgres Testcontainers + MockMvc. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
public abstract class IntegrationTest {

    /** Adresse fictive de test. */
    protected static final String TEST_ADDRESS = "12 rue de Marseille, cité El Khadra, Tunis (près de la pharmacie)";

    private static final AtomicInteger IP_SEQ = new AtomicInteger(1);
    private static final AtomicInteger PHONE_SEQ = new AtomicInteger(1);

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper mapper;

    @Autowired
    protected JdbcTemplate jdbc;

    @Autowired
    protected RateLimiters rateLimiters;

    @BeforeEach
    void resetLimits() {
        rateLimiters.resetAll();
    }

    /** Une IP distincte par appel pour ne pas déclencher la limite par IP entre tests. */
    protected static String freshIp() {
        int n = IP_SEQ.getAndIncrement();
        return "10.1." + (n / 250) + "." + (n % 250 + 1);
    }

    /** Un numéro local valide unique (8 chiffres, commence par 9). */
    protected static String freshPhone() {
        return "9" + String.format("%07d", 1_000_000 + PHONE_SEQ.getAndIncrement() * 37 % 8_999_999);
    }

    protected String json(Object o) throws Exception {
        return mapper.writeValueAsString(o);
    }

    protected JsonNode body(MvcResult r) throws Exception {
        return mapper.readTree(r.getResponse().getContentAsByteArray());
    }

    protected MockHttpServletRequestBuilder orderRequest(Map<String, Object> payload, String ip) throws Exception {
        return post("/api/orders").contentType(MediaType.APPLICATION_JSON).content(json(payload))
                .with(r -> {
                    r.setRemoteAddr(ip);
                    return r;
                });
    }

    protected static Map<String, Object> validOrder(String phone) {
        return Map.of("customerName", "Mohamed Ben Ali", "phone", phone, "governorate", "Sousse",
                "address", TEST_ADDRESS,
                "productSku", "PACK-BARISTA", "quantity", 1,
                "source", Map.of("utmSource", "tiktok", "utmCampaign", "nov", "utmContent", "reel-3"),
                "website", "");
    }

    /** Crée une commande via l'API et renvoie le JSON de réponse. */
    protected JsonNode createOrder(String phone) throws Exception {
        MvcResult r = mvc.perform(orderRequest(validOrder(phone), freshIp())).andReturn();
        if (r.getResponse().getStatus() != 201) {
            throw new IllegalStateException("Order creation failed: " + r.getResponse().getStatus() + " "
                    + r.getResponse().getContentAsString());
        }
        return body(r);
    }

    protected long orderId(String ref) {
        Long id = jdbc.queryForObject("select id from customer_order where ref = ?", Long.class, ref);
        return id == null ? -1 : id;
    }

    /** Jeton d'accès de l'admin de test (seedé depuis application-test.yml). */
    protected String adminToken() throws Exception {
        MvcResult r = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "admin@test.tn", "password", "test-password")))
                        .with(req -> {
                            req.setRemoteAddr(freshIp());
                            return req;
                        }))
                .andReturn();
        return body(r).get("accessToken").asText();
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }
}
