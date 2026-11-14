package com.shiftcart.common.security;

import com.shiftcart.common.error.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/** Identité de l'agent connecté (pour l'acteur {@code agent:<id>} des événements). */
public final class CurrentUser {

    private CurrentUser() {}

    public static long id() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return Long.parseLong(jwt.getSubject());
        }
        throw ApiException.unauthorized("UNAUTHORIZED", "Connecte-toi pour continuer.");
    }
}
