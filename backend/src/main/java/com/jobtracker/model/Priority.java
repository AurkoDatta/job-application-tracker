package com.jobtracker.model;

/**
 * Priority level a user assigns to a job application.
 *
 * <p>Defined here (Task 2) even though it is only consumed by the
 * {@code Application} document in Task 4, since it is a standalone value
 * type with no dependencies on anything auth-specific.</p>
 */
public enum Priority {
    LOW,
    MEDIUM,
    HIGH
}
