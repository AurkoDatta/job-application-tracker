package com.jobtracker.model;

import java.time.Instant;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * MongoDB document representing a registered user account.
 *
 * <p>Stores the BCrypt password hash only — the raw password is never
 * persisted. Never returned directly from a controller; API responses use
 * {@code AuthResponse} instead.</p>
 */
@Document("users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    private String id;

    private String name;

    /** Unique login identifier; enforced via a unique index on this field. */
    @Indexed(unique = true)
    private String email;

    private String passwordHash;

    private Instant createdAt;
}
