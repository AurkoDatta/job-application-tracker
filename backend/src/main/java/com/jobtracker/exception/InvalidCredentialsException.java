package com.jobtracker.exception;

/**
 * Thrown by {@code AuthService.login} when the supplied email/password
 * combination does not match a stored account.
 *
 * <p>Deliberately does not distinguish "unknown email" from "wrong
 * password" in its message, to avoid leaking which emails are registered.</p>
 */
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException(String message) {
        super(message);
    }
}
