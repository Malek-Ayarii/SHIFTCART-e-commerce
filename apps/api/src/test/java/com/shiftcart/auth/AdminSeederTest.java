package com.shiftcart.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.shiftcart.common.config.AppProperties;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Hors dev/test, les secrets de développement doivent bloquer le démarrage. */
class AdminSeederTest {

    private static final String STRONG = "a-strong-production-secret-0123456789abcdef";

    @Test
    void refusesDevJwtSecretOutsideDev() {
        assertThatThrownBy(() -> seeder(props("dev-only-jwt-secret-change-me-0123456789abcdef", STRONG, "x"), "prod")
                .run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("JWT_SECRET");
    }

    @Test
    void refusesDevTrackingSecretOutsideDev() {
        assertThatThrownBy(() -> seeder(props(STRONG, "dev-only-tracking-secret-change-me-0123456789", "x"))
                .run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("TRACKING_TOKEN_SECRET");
    }

    @Test
    void refusesDevAdminPasswordOutsideDev() {
        assertThatThrownBy(() -> seeder(props(STRONG, STRONG, "shiftcart-dev"))
                .run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("ADMIN_PASSWORD");
    }

    private static AdminSeeder seeder(AppProperties props, String... profiles) {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles(profiles);
        return new AdminSeeder(mock(AdminUserRepository.class), mock(PasswordEncoder.class), props, env,
                Clock.systemUTC());
    }

    private static AppProperties props(String jwt, String tracking, String adminPassword) {
        return new AppProperties("http://localhost:3000", List.of("http://localhost:3000"), BigDecimal.valueOf(7), 5, 0,
                Duration.ofMinutes(30), new AppProperties.Tracking(tracking),
                new AppProperties.Auth(jwt, Duration.ofMinutes(15), Duration.ofDays(14), true, "a@b.tn", adminPassword,
                        "Admin", 10, Duration.ofMinutes(10)),
                new AppProperties.RateLimit(5, Duration.ofMinutes(10), 3, Duration.ofMinutes(30)),
                new AppProperties.WhatsApp(null, null, null, null, null, "https://graph.facebook.com", "v24.0",
                        "order_confirmation", "fr", Duration.ofSeconds(10)),
                new AppProperties.Llm(null, "claude-haiku-5-5", "https://api.anthropic.com", Duration.ofSeconds(10)),
                new AppProperties.Agents(null, "claude-opus-5-5", "https://api.anthropic.com", Duration.ofSeconds(180),
                        true));
    }
}
