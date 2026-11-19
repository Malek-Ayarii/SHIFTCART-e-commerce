package com.nexoshift.auth;

/** Formes JSON de l'auth admin (docs/CONTRACT.md). */
public final class AuthDtos {

    private AuthDtos() {}

    public record LoginRequest(String email, String password) {}

    public record UserDto(Long id, String email, String name, String role) {
        static UserDto of(AdminUser u) {
            return new UserDto(u.getId(), u.getEmail(), u.getName(), u.getRole());
        }
    }

    public record AuthResponse(String accessToken, long expiresIn, UserDto user) {}
}
