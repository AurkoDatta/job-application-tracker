package com.jobtracker.repository;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.jobtracker.model.Application;

/**
 * Spring Data MongoDB repository for {@link Application} documents.
 *
 * <p>The multi-optional-filter list query (company/priority/date-range) is
 * deliberately NOT expressed here as a derived query method — that logic
 * lives in {@code ApplicationService} via {@code MongoTemplate}, since
 * derived query method names can't cleanly express "any subset of these
 * filters may or may not be present."</p>
 */
public interface ApplicationRepository extends MongoRepository<Application, String> {

    /**
     * Looks up an application by id, scoped to the owning user, so callers
     * get a single query that both finds the application and enforces
     * ownership.
     *
     * @param id     the application id
     * @param userId the expected owning user's id
     * @return the matching application, or empty if it doesn't exist or belongs to someone else
     */
    Optional<Application> findByIdAndUserId(String id, String userId);

    /**
     * Returns the highest-order application within a given column for a
     * user, if any, so {@code ApplicationService} can compute the next
     * "append at end" order when creating a card.
     *
     * @param userId   the owning user's id
     * @param columnId the column to check
     * @return the application with the highest order in that column, or empty if none exist yet
     */
    Optional<Application> findFirstByUserIdAndColumnIdOrderByOrderDesc(String userId, String columnId);
}
