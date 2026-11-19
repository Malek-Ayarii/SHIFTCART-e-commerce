package com.nexoshift.auth;

import com.nexoshift.common.config.AppProperties;
import com.nexoshift.common.error.ApiException;
import com.nexoshift.common.error.ErrorBody;
import com.nexoshift.common.ratelimit.RateLimiters;
import com.nexoshift.common.web.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public static final String REFRESH_COOKIE = "sc_refresh";
    public static final String COOKIE_PATH = "/api/auth";

    private final AuthService auth;
    private final RateLimiters rateLimiters;
    private final AppProperties props;

    public AuthController(AuthService auth, RateLimiters rateLimiters, AppProperties props) {
        this.auth = auth;
        this.rateLimiters = rateLimiters;
        this.props = props;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDtos.AuthResponse> login(@RequestBody AuthDtos.LoginRequest body,
            HttpServletRequest request) {
        if (!rateLimiters.loginByIp().tryAcquire(ClientIp.of(request))) {
            throw ApiException.rateLimited();
        }
        return withSession(auth.login(body.email(), body.password()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        try {
            return withSession(auth.refresh(refreshToken));
        } catch (ApiException e) {
            // Session invalide : 401 + effacement du cookie.
            return ResponseEntity.status(e.getStatus())
                    .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                    .body(new ErrorBody(e.getCode(), e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        auth.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie("", Duration.ZERO).toString())
                .build();
    }

    @GetMapping("/me")
    public AuthDtos.UserDto me(@AuthenticationPrincipal Jwt jwt) {
        if (jwt == null) {
            throw ApiException.unauthorized("UNAUTHORIZED", "Connecte-toi pour continuer.");
        }
        return auth.me(Long.parseLong(jwt.getSubject()));
    }

    private ResponseEntity<AuthDtos.AuthResponse> withSession(AuthService.Session session) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE,
                        cookie(session.refreshToken(), props.auth().refreshTokenTtl()).toString())
                .body(session.response());
    }

    private ResponseCookie cookie(String value, Duration maxAge) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(props.auth().cookieSecure())
                .sameSite("Lax")
                .path(COOKIE_PATH)
                .maxAge(maxAge)
                .build();
    }
}
