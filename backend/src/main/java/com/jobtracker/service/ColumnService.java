package com.jobtracker.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.jobtracker.dto.column.ColumnRequest;
import com.jobtracker.dto.column.ColumnResponse;
import com.jobtracker.exception.ResourceNotFoundException;
import com.jobtracker.model.Column;
import com.jobtracker.repository.ColumnRepository;

/**
 * Business logic for a user's Kanban columns: listing, creation,
 * rename/reorder, deletion, and the default-column seeding that runs once
 * at registration time.
 */
@Service
public class ColumnService {

    /** Names, in display order, seeded for every brand-new user. */
    private static final List<String> DEFAULT_COLUMN_NAMES =
            List.of("Wishlist", "Applied", "Interview", "Offer", "Rejected");

    private final ColumnRepository columnRepository;

    public ColumnService(ColumnRepository columnRepository) {
        this.columnRepository = columnRepository;
    }

    /**
     * Returns the given user's columns, ordered by display position.
     *
     * @param userId the owning user's id
     * @return the user's columns, ordered ascending by {@code order}
     */
    public List<ColumnResponse> getColumnsForUser(String userId) {
        return columnRepository.findByUserIdOrderByOrderAsc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates a new column for the given user.
     *
     * @param userId  the owning user's id
     * @param request the column name and optional explicit order
     * @return the created column
     */
    public ColumnResponse createColumn(String userId, ColumnRequest request) {
        // A null order means "append at the end"; an explicit order is used
        // as-is without shifting any other columns (no drag-and-drop
        // reordering endpoint exists for columns in this plan).
        int order = request.order() != null ? request.order() : nextAppendOrder(userId);

        Column column = Column.builder()
                .userId(userId)
                .name(request.name())
                .order(order)
                .build();
        return toResponse(columnRepository.save(column));
    }

    /**
     * Renames and/or reorders an existing column.
     *
     * @param userId   the owning user's id, used to enforce ownership
     * @param columnId the column to update
     * @param request  the new name, and optionally a new order
     * @return the updated column
     * @throws ResourceNotFoundException if the column doesn't exist or belongs to a different user
     */
    public ColumnResponse renameOrReorderColumn(String userId, String columnId, ColumnRequest request) {
        Column column = findOwnedColumn(userId, columnId);
        column.setName(request.name());
        if (request.order() != null) {
            column.setOrder(request.order());
        }
        return toResponse(columnRepository.save(column));
    }

    /**
     * Deletes a column.
     *
     * @param userId   the owning user's id, used to enforce ownership
     * @param columnId the column to delete
     * @throws ResourceNotFoundException if the column doesn't exist or belongs to a different user
     */
    public void deleteColumn(String userId, String columnId) {
        Column column = findOwnedColumn(userId, columnId);
        columnRepository.delete(column);
    }

    /**
     * Creates the five default columns for a brand-new user. Called once,
     * right after registration succeeds — never on login.
     *
     * @param userId the newly registered user's id
     */
    public void seedDefaultColumns(String userId) {
        List<Column> defaults = new ArrayList<>(DEFAULT_COLUMN_NAMES.size());
        for (int order = 0; order < DEFAULT_COLUMN_NAMES.size(); order++) {
            defaults.add(Column.builder()
                    .userId(userId)
                    .name(DEFAULT_COLUMN_NAMES.get(order))
                    .order(order)
                    .build());
        }
        columnRepository.saveAll(defaults);
    }

    /**
     * Looks up a column and enforces ownership in one step so that a
     * missing column and one owned by someone else are indistinguishable
     * to the caller — both surface as a 404, never a 403 that would leak
     * the column's existence.
     */
    private Column findOwnedColumn(String userId, String columnId) {
        return columnRepository.findByIdAndUserId(columnId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
    }

    /** One more than the user's current highest order, or 0 if they have no columns yet. */
    private int nextAppendOrder(String userId) {
        return columnRepository.findFirstByUserIdOrderByOrderDesc(userId)
                .map(column -> column.getOrder() + 1)
                .orElse(0);
    }

    private ColumnResponse toResponse(Column column) {
        return new ColumnResponse(column.getId(), column.getUserId(), column.getName(), column.getOrder());
    }
}
