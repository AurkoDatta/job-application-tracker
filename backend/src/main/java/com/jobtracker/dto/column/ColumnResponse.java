package com.jobtracker.dto.column;

/**
 * Response body for column endpoints.
 *
 * @param id     the column's id
 * @param userId the owning user's id
 * @param name   the column's display name
 * @param order  the column's display position
 */
public record ColumnResponse(
        String id,
        String userId,
        String name,
        int order
) {
}
