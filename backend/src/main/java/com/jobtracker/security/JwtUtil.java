package com.jobtracker.security;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Generates and validates the stateless JWTs used for authentication.
 *
 * <p>Written against the jjwt 0.12.x builder/parser API
 * ({@code Jwts.builder()...signWith(...)}, {@code Jwts.parser()...build()})
 * rather than the deprecated 0.11.x {@code setSubject}-style API.</p>
 */
@Component
public class JwtUtil {

    private final SecretKey secretKey;
    private final long expirationMs;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms}") long expirationMs
    ) {
        // HMAC-SHA key derived from the configured secret; jjwt enforces a
        // minimum key length for the chosen algorithm at construction time.
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationMs = expirationMs;
    }

    /**
     * Builds a signed JWT whose subject is the user's email.
     *
     * @param email the authenticated user's email, used as the JWT subject
     * @return the compact, signed JWT string
     */
    public String generate(String email) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(email)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(secretKey)
                .compact();
    }

    /**
     * Checks whether a token is well-formed, correctly signed, and not
     * expired.
     *
     * @param token the compact JWT string to validate
     * @return true if the token parses and verifies cleanly
     */
    public boolean validate(String token) {
        try {
            Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            // Malformed, expired, or tampered token — treat as invalid
            // rather than propagating, so the filter can simply leave the
            // request unauthenticated instead of failing the whole chain.
            return false;
        }
    }

    /**
     * Extracts the email (subject) from a token without re-validating the
     * signature; callers are expected to have already called
     * {@link #validate(String)}.
     *
     * @param token the compact JWT string
     * @return the email stored as the JWT subject
     */
    public String extractEmail(String token) {
        Claims claims = Jwts.parser().verifyWith(secretKey).build()
                .parseSignedClaims(token).getPayload();
        return claims.getSubject();
    }
}
