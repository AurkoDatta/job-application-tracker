package com.jobtracker.model;

import java.time.Instant;
import java.time.LocalDate;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * MongoDB document representing a single job application card on a user's
 * Kanban board.
 *
 * <p>Never returned directly from a controller; API responses use
 * {@code ApplicationResponse} instead.</p>
 */
@Document("applications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    private String id;

    /** Owning user's id — every query is scoped by this to enforce per-user isolation. */
    private String userId;

    /** The Kanban column this card currently sits in. */
    private String columnId;

    private String company;

    private String role;

    private String jobUrl;

    private String location;

    private String salaryRange;

    private LocalDate appliedDate;

    private LocalDate followUpDate;

    private Priority priority;

    private String notes;

    /** Zero-based display position among the owning user's cards within {@code columnId}. */
    private int order;

    private Instant createdAt;

    private Instant updatedAt;
}
