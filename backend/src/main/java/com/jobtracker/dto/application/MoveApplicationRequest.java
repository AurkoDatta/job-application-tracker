package com.jobtracker.dto.application;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for {@code PATCH /api/applications/{id}/move}.
 *
 * <p>Carries the exact destination column and order the frontend wants —
 * the backend persists these verbatim with no shifting/renumbering of
 * sibling applications, since the frontend does optimistic full-board state
 * management and always sends the final position after a drag-and-drop.</p>
 *
 * @param columnId the destination column's id
 * @param order    the destination display position within that column
 */
public record MoveApplicationRequest(
        @NotBlank(message = "Column id is required")
        String columnId,

        @NotNull(message = "Order is required")
        Integer order
) {
}
