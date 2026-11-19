package com.nexoshift.whatsapp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexoshift.common.config.AppProperties;
import com.nexoshift.common.error.ApiException;
import com.nexoshift.common.security.Hashing;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Webhook Meta WhatsApp Cloud API. */
@RestController
@RequestMapping("/api/webhooks/whatsapp")
public class WhatsAppWebhookController {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppWebhookController.class);

    private final AppProperties props;
    private final WhatsAppInboundService inbound;
    private final ObjectMapper mapper;

    public WhatsAppWebhookController(AppProperties props, WhatsAppInboundService inbound, ObjectMapper mapper) {
        this.props = props;
        this.inbound = inbound;
        this.mapper = mapper;
    }

    /** Vérification de l'abonnement : renvoie {@code hub.challenge} si le jeton correspond, sinon 403. */
    @GetMapping(produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> verify(
            @RequestParam(name = "hub.mode", required = false) String mode,
            @RequestParam(name = "hub.verify_token", required = false) String token,
            @RequestParam(name = "hub.challenge", required = false) String challenge) {
        String expected = props.whatsapp().verifyToken();
        if ("subscribe".equals(mode) && expected != null && !expected.isBlank()
                && Hashing.constantTimeEquals(expected, token) && challenge != null) {
            return ResponseEntity.ok().contentType(MediaType.TEXT_PLAIN).body(challenge);
        }
        throw ApiException.forbidden("Jeton de vérification invalide.");
    }

    /**
     * Notifications : signature {@code X-Hub-Signature-256: sha256=<hex>} = HMAC-SHA256(corps brut,
     * WHATSAPP_APP_SECRET). 403 si absente/invalide ; sinon 200 (même si le contenu est inattendu, pour que
     * Meta ne réessaie pas en boucle).
     */
    @PostMapping(consumes = MediaType.ALL_VALUE)
    public ResponseEntity<Void> receive(@RequestBody(required = false) byte[] rawBody,
            @RequestHeader(name = "X-Hub-Signature-256", required = false) String signature) {
        byte[] body = rawBody == null ? new byte[0] : rawBody;
        String secret = props.whatsapp().appSecret();
        if (secret == null || secret.isBlank()) {
            log.warn("WhatsApp webhook received but WHATSAPP_APP_SECRET is not set: rejected");
            throw ApiException.forbidden("Signature invalide.");
        }
        String expected = "sha256=" + Hashing.hmacSha256Hex(secret, body);
        if (signature == null || !Hashing.constantTimeEquals(expected, signature.trim().toLowerCase())) {
            log.warn("WhatsApp webhook with invalid signature rejected");
            throw ApiException.forbidden("Signature invalide.");
        }
        JsonNode payload;
        try {
            payload = mapper.readTree(body);
        } catch (IOException e) {
            log.warn("WhatsApp webhook: unreadable JSON body ignored");
            return ResponseEntity.ok().build();
        }
        if (payload == null) {
            return ResponseEntity.ok().build();
        }
        try {
            inbound.handle(payload);
        } catch (RuntimeException e) {
            // On répond quand même 200 : l'erreur est loguée (sans données client) pour analyse.
            // Pas de pile : un message d'erreur SQL peut recopier le numéro du client.
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) {
                root = root.getCause();
            }
            log.error("WhatsApp webhook processing failed: {} (root {})", e.getClass().getName(),
                    root.getClass().getName());
        }
        return ResponseEntity.ok().build();
    }
}
