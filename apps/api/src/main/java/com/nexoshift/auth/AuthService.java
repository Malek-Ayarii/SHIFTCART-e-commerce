package com.nexoshift.auth;

import com.nexoshift.common.config.AppProperties;
import com.nexoshift.common.error.ApiException;
import com.nexoshift.common.security.Hashing;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Connexion admin : BCrypt, JWT d'accès 15 min, refresh token opaque (cookie httpOnly) stocké haché,
 * rotation à chaque refresh. Réutiliser un refresh déjà tourné révoque toute la famille de l'utilisateur.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final AdminUserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final AppProperties props;
    private final Clock clock;
    /** Hash BCrypt factice : temps de réponse identique quand l'email est inconnu. */
    private final String dummyHash;

    public AuthService(AdminUserRepository users, RefreshTokenRepository refreshTokens,
            PasswordEncoder passwordEncoder, JwtService jwt, AppProperties props, Clock clock) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.props = props;
        this.clock = clock;
        this.dummyHash = passwordEncoder.encode("nexoshift-timing-equalizer");
    }

    /** Une session : la réponse JSON + le refresh token brut à poser en cookie. */
    public record Session(AuthDtos.AuthResponse response, String refreshToken) {}

    @Transactional
    public Session login(String email, String password) {
        Optional<AdminUser> found = email == null ? Optional.empty() : users.findByEmailIgnoreCase(email.trim());
        String hash = found.map(AdminUser::getPasswordHash).orElse(dummyHash);
        boolean ok = password != null && passwordEncoder.matches(password, hash);
        if (found.isEmpty() || !ok || !found.get().isActive()) {
            throw badCredentials();
        }
        AdminUser user = found.get();
        log.info("Admin login: user {}", user.getId());
        return newSession(user, null);
    }

    @Transactional(noRollbackFor = ApiException.class)
    public Session refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw invalidSession();
        }
        Instant now = clock.instant();
        RefreshToken current = refreshTokens.findByTokenHashForUpdate(Hashing.sha256Hex(rawRefreshToken))
                .orElseThrow(AuthService::invalidSession);
        if (current.getRevokedAt() != null) {
            // Réutilisation d'un jeton déjà tourné : probable vol → on coupe toutes les sessions.
            refreshTokens.revokeAllForUser(current.getUserId(), now);
            log.warn("Refresh token reuse detected for user {}: all sessions revoked", current.getUserId());
            throw invalidSession();
        }
        if (!current.isActive(now)) {
            throw invalidSession();
        }
        AdminUser user = users.findById(current.getUserId()).filter(AdminUser::isActive)
                .orElseThrow(AuthService::invalidSession);
        return newSession(user, current);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokens.findByTokenHashForUpdate(Hashing.sha256Hex(rawRefreshToken))
                .filter(t -> t.getRevokedAt() == null)
                .ifPresent(t -> t.revoke(clock.instant(), null));
    }

    @Transactional(readOnly = true)
    public AuthDtos.UserDto me(long userId) {
        return users.findById(userId).filter(AdminUser::isActive).map(AuthDtos.UserDto::of)
                .orElseThrow(() -> ApiException.unauthorized("UNAUTHORIZED", "Connecte-toi pour continuer."));
    }

    @Scheduled(cron = "0 17 3 * * *")
    @Transactional
    public void purgeExpired() {
        refreshTokens.deleteExpired(clock.instant().minus(props.auth().refreshTokenTtl()));
    }

    private Session newSession(AdminUser user, RefreshToken rotated) {
        Instant now = clock.instant();
        String raw = Hashing.randomToken(32);
        RefreshToken fresh = refreshTokens.save(new RefreshToken(
                user.getId(), Hashing.sha256Hex(raw), now.plus(props.auth().refreshTokenTtl()), now));
        if (rotated != null) {
            rotated.revoke(now, fresh.getId());
        }
        AuthDtos.AuthResponse response = new AuthDtos.AuthResponse(
                jwt.issue(user), jwt.expiresInSeconds(), AuthDtos.UserDto.of(user));
        return new Session(response, raw);
    }

    static ApiException badCredentials() {
        return ApiException.unauthorized("BAD_CREDENTIALS", "Email ou mot de passe incorrect.");
    }

    static ApiException invalidSession() {
        return ApiException.unauthorized("INVALID_REFRESH_TOKEN", "Ta session a expiré. Reconnecte-toi.");
    }
}
