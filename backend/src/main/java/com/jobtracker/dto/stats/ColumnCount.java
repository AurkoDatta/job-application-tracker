package com.jobtracker.dto.stats;

/**
 * How many of a user's applications currently sit in one Kanban column.
 *
 * <p>Deliberately carries {@code columnName} alongside {@code columnId} so
 * the analytics page can label a bar/pie slice without a second round trip
 * to {@code GET /api/columns}. Emitted for <em>every</em> column the user
 * owns, including ones holding no applications at all ({@code count} 0) —
 * an empty "Offer" column is meaningful information on a funnel chart, and
 * a raw {@code $group} would simply omit it.</p>
 *
 * @param columnId   the column's id
 * @param columnName the column's display name at the time stats were computed
 * @param count      number of the user's applications currently in that column
 */
public record ColumnCount(
        String columnId,
        String columnName,
        long count
) {
}
