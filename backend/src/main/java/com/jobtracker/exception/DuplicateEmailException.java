package com.jobtracker.exception;

/**
 * Thrown by {@code AuthService.register} when the requested email is
 * already associated with an existing account.
 */
public class DuplicateEmailException extends RuntimeException {

    public DuplicateEmailException(String message) {
        super(message);
    }
}
