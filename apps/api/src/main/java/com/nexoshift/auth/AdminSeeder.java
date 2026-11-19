package com.nexoshift.auth;

import com.nexoshift.common.config.AppProperties;
import java.time.Clock;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crée le compte admin depuis {@code ADMIN_EMAIL} / {@code ADMIN_PASSWORD} quand la table est vide,
 * et refuse de démarrer si des secrets de développement sont utilisés hors profil dev/test.
 */
@Component
public class AdminSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final AdminUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties props;
    private final Environment env;
    private final Clock clock;

    public AdminSeeder(AdminUserRepository users, PasswordEncoder passwordEncoder, AppProperties props,
            Environment env, Clock clock) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.props = props;
        this.env = env;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        warnOnDevSecrets();
        if (users.count() > 0) {
            return;
        }
        String email = props.auth().adminEmail();
        String password = props.auth().adminPassword();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("No admin user and ADMIN_EMAIL / ADMIN_PASSWORD not set: nobody can log in to the back-office");
            return;
        }
        AdminUser admin = users.save(new AdminUser(email.trim().toLowerCase(), props.auth().adminName(),
                passwordEncoder.encode(password), AdminUser.ROLE_ADMIN, clock.instant()));
        log.info("Seeded admin user {} from ADMIN_EMAIL", admin.getId());
    }

    private void warnOnDevSecrets() {
        boolean devOrTest = Arrays.stream(env.getActiveProfiles()).anyMatch(p -> p.equals("dev") || p.equals("test"));
        if (devOrTest) {
            return;
        }
        // Hors dev/test, les secrets de développement (publics, dans le dépôt) bloquent le démarrage.
        if (props.auth().jwtSecret().startsWith("dev-only-")) {
            throw new IllegalStateException("JWT_SECRET uses the development default: set a strong secret");
        }
        if (props.tracking().secret().startsWith("dev-only-")) {
            throw new IllegalStateException("TRACKING_TOKEN_SECRET uses the development default: set a strong secret");
        }
        if ("nexoshift-dev".equals(props.auth().adminPassword())) {
            throw new IllegalStateException("ADMIN_PASSWORD uses the development default: choose another password");
        }
        if (!props.auth().cookieSecure()) {
            log.warn("COOKIE_SECURE=false outside dev: the refresh cookie will be sent over HTTP");
        }
    }
}
