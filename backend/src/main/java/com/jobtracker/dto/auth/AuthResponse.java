package com.jobtracker.dto.auth;

/**
 * Response body for register/login/logout endpoints.
 *
 * <p>Deliberately carries user info only — the JWT itself is never
 * included in the JSON body, since it is delivered exclusively via an
 * httpOnly {@code token} cookie that client-side JavaScript cannot read.</p>
 *
 * @param id    the user's id
 * @param name  the user's display name
 * @param email the user's login email
 */
public record AuthResponse(
        String id,
        String name,
        String email
) {
}
