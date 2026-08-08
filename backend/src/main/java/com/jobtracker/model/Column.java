package com.jobtracker.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * MongoDB document representing a single Kanban column (e.g. "Applied",
 * "Interview") belonging to one user's board.
 *
 * <p>Never returned directly from a controller; API responses use
 * {@code ColumnResponse} instead.</p>
 */
@Document("columns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Column {

    @Id
    private String id;

    /** Owning user's id — every query is scoped by this to enforce per-user isolation. */
    private String userId;

    private String name;

    /** Zero-based display position among the owning user's columns. */
    private int order;
}
