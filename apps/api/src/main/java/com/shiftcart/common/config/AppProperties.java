package com.shiftcart.common.config;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** All application settings, bound from {@code shiftcart.*} (see application.yml / .env.example). */
@ConfigurationProperties(prefix = "shiftcart")
public record AppProperties(
        @DefaultValue("http://localhost:3000") String shopPublicUrl,
        @DefaultValue("http://localhost:3000,http://localhost:4300") List<String> allowedOrigins,
        @DefaultValue("7") BigDecimal carrierFeeTnd,
        @DefaultValue("5") int packAlertThreshold,
        @DefaultValue("0") int autoPendingAfterHours,
        @DefaultValue("30m") Duration duplicateWindow,
        @DefaultValue Tracking tracking,
        @DefaultValue Auth auth,
        @DefaultValue RateLimit rateLimit,
        @DefaultValue WhatsApp whatsapp,
        @DefaultValue Llm llm) {

    public record Tracking(String secret) {}

    public record Auth(
            String jwtSecret,
            @DefaultValue("15m") Duration accessTokenTtl,
            @DefaultValue("14d") Duration refreshTokenTtl,
            @DefaultValue("true") boolean cookieSecure,
            String adminEmail,
            String adminPassword,
            @DefaultValue("Admin") String adminName,
            @DefaultValue("10") int loginMaxAttempts,
            @DefaultValue("10m") Duration loginWindow) {}

    public record RateLimit(
            @DefaultValue("5") int ipMax,
            @DefaultValue("10m") Duration ipWindow,
            @DefaultValue("3") int phoneMax,
            @DefaultValue("30m") Duration phoneWindow) {}

    public record WhatsApp(
            String shopNumber,
            String token,
            String phoneNumberId,
            String verifyToken,
            String appSecret,
            @DefaultValue("https://graph.facebook.com") String graphBaseUrl,
            @DefaultValue("v24.0") String graphVersion,
            @DefaultValue("order_confirmation") String templateName,
            @DefaultValue("fr") String templateLanguage,
            @DefaultValue("10s") Duration timeout) {

        public boolean sendingConfigured() {
            return notBlank(token) && notBlank(phoneNumberId);
        }
    }

    public record Llm(
            String apiKey,
            @DefaultValue("claude-haiku-5-5") String model,
            @DefaultValue("https://api.anthropic.com") String baseUrl,
            @DefaultValue("10s") Duration timeout) {

        public boolean configured() {
            return notBlank(apiKey);
        }
    }

    static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
