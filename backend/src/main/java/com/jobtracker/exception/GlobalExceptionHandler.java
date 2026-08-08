package com.jobtracker.exception;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Centralized exception handler that maps custom and framework exceptions
 * to a consistent JSON error shape ({@code { message, status, timestamp }})
 * across every controller in the application.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Maps a duplicate-email registration attempt to 409 Conflict. */
    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateEmail(DuplicateEmailException ex) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    /** Maps a bad login attempt to 401 Unauthorized. */
    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(InvalidCredentialsException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    /** Maps a missing-resource lookup to 404 Not Found. */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    /**
     * Maps Bean Validation failures (e.g. {@code @Valid} request body
     * violations) to 400 Bad Request, including a field-level breakdown so
     * the frontend can highlight the offending inputs.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(
                error -> fieldErrors.put(error.getField(), error.getDefaultMessage())
        );

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "Validation failed");
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("timestamp", Instant.now());
        body.put("errors", fieldErrors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Maps a request-param binding failure (e.g. {@code ?priority=URGENT}
     * where {@code Priority} has no such enum constant) to 400 Bad Request.
     * Spring throws this from the binding layer before the controller
     * method body runs, so without this handler it would otherwise fall
     * through to the generic 500 handler below — added in Task 4 since
     * Task 2 only had body-validation ({@code @Valid}) failures to handle.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = "Invalid value '" + ex.getValue() + "' for parameter '" + ex.getName() + "'";
        return buildResponse(HttpStatus.BAD_REQUEST, message);
    }

    /** Catch-all fallback so unexpected failures still return the standard error shape, not a raw stack trace. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", message);
        body.put("status", status.value());
        body.put("timestamp", Instant.now());
        return ResponseEntity.status(status).body(body);
    }
}
