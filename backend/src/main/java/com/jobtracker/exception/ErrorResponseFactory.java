package com.jobtracker.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * Builds this project's standard {@code {message, status, timestamp}} error
 * body — the single source of truth for that shape so it can be produced
 * identically both inside the normal Spring MVC dispatch path
 * ({@link GlobalExceptionHandler}, for exceptions thrown by controllers/
 * services) and outside it (the {@code AuthenticationEntryPoint} in
 * {@code SecurityConfig}, for unauthenticated requests rejected by the
 * security filter chain before a controller is ever reached — Spring
 * Security's default {@code Http403ForbiddenEntryPoint} would otherwise
 * emit its own generic {@code {timestamp, status, error, path}} body
 * instead of this one). Extracted here specifically so those two call
 * sites can't drift apart.
 */
public final class ErrorResponseFactory {

    private ErrorResponseFactory() {
    }

    /**
     * @param status  the HTTP status to report in the body (and expected to
     *                match the response's actual status line)
     * @param message a human-readable description of the failure
     * @return a mutable, insertion-ordered map matching {@code {message, status, timestamp}}
     */
    public static Map<String, Object> build(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("status", status.value());
        body.put("timestamp", Instant.now());
        return body;
    }
}
