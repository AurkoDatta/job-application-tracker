package com.jobtracker.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.jobtracker.model.Column;

/**
 * Spring Data MongoDB repository for {@link Column} documents.
 */
public interface ColumnRepository extends MongoRepository<Column, String> {

    /**
     * Returns a user's columns ordered by their display position ascending.
     *
     * @param userId the owning user's id
     * @return the user's columns, ordered
     */
    List<Column> findByUserIdOrderByOrderAsc(String userId);

    /**
     * Looks up a column by id, scoped to the owning user, so callers get a
     * single query that both finds the column and enforces ownership.
     *
     * @param id     the column id
     * @param userId the expected owning user's id
     * @return the matching column, or empty if it doesn't exist or belongs to someone else
     */
    Optional<Column> findByIdAndUserId(String id, String userId);

    /**
     * Returns the user's highest-order column, if any, so
     * {@code ColumnService} can compute the next "append at end" order.
     *
     * @param userId the owning user's id
     * @return the column with the highest order, or empty if the user has no columns yet
     */
    Optional<Column> findFirstByUserIdOrderByOrderDesc(String userId);
}
