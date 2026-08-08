package com.jobtracker.controller;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jobtracker.dto.auth.AuthResponse;
import com.jobtracker.dto.auth.LoginRequest;
import com.jobtracker.dto.auth.RegisterRequest;
import com.jobtracker.security.CustomUserDetails;
import com.jobtracker.service.AuthService;

import jakarta.validation.Valid;

/**
 * Thin REST layer for registration, login, and logout. All business logic
 * (password hashing, credential checks, JWT issuance) lives in
 * {@link AuthService}; this controller's only auth-specific responsibility
 * is translating the issued JWT into the httpOnly {@code token} cookie.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String COOKIE_NAME = "token";

    private final AuthService authService;
    private final boolean cookieSecure;
    private final long jwtExpirationMs;

    public AuthController(
            AuthService authService,
            @Value("${cookie.secure}") boolean cookieSecure,
            @Value("${jwt.expiration-ms}") long jwtExpirationMs
    ) {
        this.authService = authService;
        this.cookieSecure = cookieSecure;
        this.jwtExpirationMs = jwtExpirationMs;
    }

    /** Registers a new account and sets the httpOnly auth cookie on success. */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthService.AuthResult result = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, buildAuthCookie(result.token()).toString())
                .body(result.user());
    }

    /** Verifies credentials and sets a fresh httpOnly auth cookie on success. */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.AuthResult result = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, buildAuthCookie(result.token()).toString())
                .body(result.user());
    }

    /**
     * Clears the auth cookie. No server-side session/token store exists to
     * invalidate (auth is stateless JWT), so logout is purely a matter of
     * telling the browser to drop the cookie.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        ResponseCookie expiredCookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(0)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, expiredCookie.toString())
                .build();
    }

    /**
     * Returns the currently authenticated user, letting the frontend answer
     * "is there already a valid session?" on page load/refresh. The JWT
     * lives in an httpOnly cookie the frontend JS can never read directly,
     * so this endpoint (guarded as {@code authenticated()} in
     * {@code SecurityConfig}, unlike the rest of {@code /api/auth/**}) is
     * the only way the SPA can restore auth state after a hard refresh.
     * Spring Security populates {@code principal} from the {@code token}
     * cookie via {@code JwtAuthFilter}; an absent/invalid cookie never
     * reaches this method body at all — the security filter chain rejects
     * it with 401/403 first.
     */
    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(authService.toAuthResponse(principal.getUser()));
    }

    /**
     * Builds the {@code token} cookie carrying the JWT. httpOnly prevents
     * client-side JS from ever reading it (XSS mitigation); SameSite=Lax
     * still allows it to be sent on top-level navigations and same-site
     * XHR/fetch from the Vite dev app while blocking most cross-site
     * request forgery vectors; secure is driven by config so it can stay
     * off for local http dev but must be on for any real https deployment.
     */
    private ResponseCookie buildAuthCookie(String jwt) {
        return ResponseCookie.from(COOKIE_NAME, jwt)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMillis(jwtExpirationMs))
                .build();
    }
}
