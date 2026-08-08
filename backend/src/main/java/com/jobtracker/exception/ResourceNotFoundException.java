package com.jobtracker.exception;

/**
 * Thrown when a requested resource cannot be found.
 *
 * <p>Not raised by anything in the auth flow itself (Task 2), but defined
 * now since it is a generic exception used by later tasks' services
 * (columns, applications) and belongs alongside the other custom
 * exceptions handled by {@link GlobalExceptionHandler}.</p>
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
