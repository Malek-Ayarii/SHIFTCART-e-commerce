package com.nexoshift.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.nexoshift.IntegrationTest;
import jakarta.servlet.http.Cookie;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

class AuthApiTest extends IntegrationTest {

    private MvcResult login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", password)))
                        .with(r -> {
                            r.setRemoteAddr(freshIp());
                            return r;
                        }))
                .andReturn();
    }

    @Test
    void loginReturnsTokenUserAndRefreshCookie() throws Exception {
        MvcResult r = login("ADMIN@test.tn", "test-password");
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        var body = body(r);
        assertThat(body.get("accessToken").asText()).isNotBlank();
        assertThat(body.get("expiresIn").asLong()).isEqualTo(900);
        assertThat(body.get("user").get("email").asText()).isEqualTo("admin@test.tn");
        assertThat(body.get("user").get("role").asText()).isEqualTo("ADMIN");
        assertThat(body.get("user").get("id").asLong()).isPositive();
        assertThat(body.get("user").has("name")).isTrue();
        String setCookie = r.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(setCookie).startsWith("sc_refresh=").contains("Path=/api/auth").contains("HttpOnly")
                .contains("SameSite=Lax").contains("Max-Age=1209600");
    }

    @Test
    void badCredentialsAre401WithContractShape() throws Exception {
        MvcResult r = login("admin@test.tn", "wrong");
        assertThat(r.getResponse().getStatus()).isEqualTo(401);
        assertThat(body(r).get("error").asText()).isEqualTo("BAD_CREDENTIALS");
        assertThat(body(r).get("message").asText()).isEqualTo("Email ou mot de passe incorrect.");
        assertThat(login("nobody@test.tn", "test-password").getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void adminRoutesRequireAToken() throws Exception {
        mvc.perform(get("/api/admin/orders"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("UNAUTHORIZED"));
        mvc.perform(get("/api/admin/orders").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void meReturnsTheUser() throws Exception {
        String token = body(login("admin@test.tn", "test-password")).get("accessToken").asText();
        mvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("admin@test.tn"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
        mvc.perform(get("/api/admin/orders").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());
    }

    @Test
    void refreshRotatesTokenAndDetectsReuse() throws Exception {
        MvcResult loggedIn = login("admin@test.tn", "test-password");
        String first = refreshCookieValue(loggedIn);

        MvcResult refreshed = mvc.perform(post("/api/auth/refresh").cookie(new Cookie("sc_refresh", first)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("admin@test.tn"))
                .andReturn();
        String second = refreshCookieValue(refreshed);
        assertThat(second).isNotEqualTo(first);

        // Rejouer l'ancien jeton : 401 et toute la famille est révoquée.
        mvc.perform(post("/api/auth/refresh").cookie(new Cookie("sc_refresh", first)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("INVALID_REFRESH_TOKEN"));
        mvc.perform(post("/api/auth/refresh").cookie(new Cookie("sc_refresh", second)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshWithoutCookieIs401() throws Exception {
        mvc.perform(post("/api/auth/refresh")).andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesAndClearsCookie() throws Exception {
        String refresh = refreshCookieValue(login("admin@test.tn", "test-password"));
        MvcResult out = mvc.perform(post("/api/auth/logout").cookie(new Cookie("sc_refresh", refresh)))
                .andExpect(status().isNoContent())
                .andReturn();
        assertThat(out.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("sc_refresh=").contains("Max-Age=0");
        mvc.perform(post("/api/auth/refresh").cookie(new Cookie("sc_refresh", refresh)))
                .andExpect(status().isUnauthorized());
    }

    private static String refreshCookieValue(MvcResult r) {
        String header = r.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(header).isNotNull();
        return header.substring("sc_refresh=".length(), header.indexOf(';'));
    }
}
