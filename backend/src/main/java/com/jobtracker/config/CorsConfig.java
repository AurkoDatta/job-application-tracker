package com.jobtracker.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS configuration allowing the Vite dev server to call this API with
 * credentials (cookies) attached.
 *
 * <p>The allowed origin(s) must be explicit values or credential-safe
 * patterns, never a bare {@code "*"} — browsers reject wildcard origins on
 * requests made with {@code credentials: include}, which is required for
 * the httpOnly JWT cookie to be sent cross-origin between the frontend
 * (5173 by default) and backend (8080) during local development.</p>
 *
 * <p>The wildcard-localhost-port pattern below is only appropriate for local
 * dev — it isn't gated behind a Spring {@code @Profile} (nothing else in
 * this project uses profiles yet, so introducing one just for this would be
 * a bigger structural change than the fix warrants), but it is externalized
 * via {@code cors.allowed-origin-pattern} (see {@code application.yml}, same
 * {@code ${ENV_VAR:default}} convention as {@code jwt.secret}/
 * {@code MONGODB_URI}) rather than hardcoded. The default is the wildcard
 * pattern, so every documented local-dev setup in the README is completely
 * unaffected; a future production deployment would set
 * {@code CORS_ALLOWED_ORIGIN_PATTERN} to its real origin(s) to stop this
 * pattern from following it there unchanged.</p>
 */
@Configuration
public class CorsConfig {

    private final String allowedOriginPattern;

    public CorsConfig(@Value("${cors.allowed-origin-pattern}") String allowedOriginPattern) {
        this.allowedOriginPattern = allowedOriginPattern;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Vite's dev port isn't always 5173 in practice — it auto-falls-back
        // to 5174, 5175, etc. whenever the preceding port is already taken
        // by something else on the developer's machine, and hardcoding one
        // exact origin (or even a short fixed list of a few) just means the
        // same CORS failure recurs the next time a different port is free.
        // setAllowedOriginPatterns (not setAllowedOrigins) is the
        // credentialed-CORS-safe way to pattern-match here: unlike a bare
        // "*" origin, Spring still echoes back the actual matched origin
        // (not a literal "*") in the response, which is what browsers
        // require when allowCredentials(true) is set. The pattern itself
        // comes from config (see the class-level comment above), defaulting
        // to localhost-only for local dev, not a general cross-origin
        // opt-in.
        configuration.setAllowedOriginPatterns(List.of(allowedOriginPattern));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "Authorization"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
