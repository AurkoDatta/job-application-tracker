package com.jobtracker.dto.column;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for creating or updating a column
 * ({@code POST /api/columns}, {@code PUT /api/columns/{id}}).
 *
 * @param name  the column's display name
 * @param order the column's display position; {@code null} means "append at
 *              the end" on create, or "leave unchanged" on update
 */
public record ColumnRequest(
        @NotBlank(message = "Name is required")
        String name,

        Integer order
) {
}
