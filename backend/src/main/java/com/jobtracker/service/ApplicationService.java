package com.jobtracker.service;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import com.jobtracker.dto.application.ApplicationRequest;
import com.jobtracker.dto.application.ApplicationResponse;
import com.jobtracker.dto.application.MoveApplicationRequest;
import com.jobtracker.exception.ResourceNotFoundException;
import com.jobtracker.model.Application;
import com.jobtracker.model.Priority;
import com.jobtracker.repository.ApplicationRepository;
import com.jobtracker.repository.ColumnRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * Business logic for a user's job application cards: filtered listing,
 * creation, full edit, drag-and-drop move, and deletion.
 */
@Slf4j
@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final ColumnRepository columnRepository;
    private final MongoTemplate mongoTemplate;

    public ApplicationService(
            ApplicationRepository applicationRepository,
            ColumnRepository columnRepository,
            MongoTemplate mongoTemplate
    ) {
        this.applicationRepository = applicationRepository;
        this.columnRepository = columnRepository;
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Returns the given user's applications, optionally narrowed by any
     * combination of company (substring), priority (exact), and applied
     * date range.
     *
     * <p>Built with {@code MongoTemplate}/{@code Criteria} rather than a
     * derived query method: every filter is optional and independently
     * combinable (any subset of company/priority/startDate/endDate may be
     * present), which a derived query method name can't express without an
     * explosion of overloads — a single dynamically-assembled {@code Query}
     * handles all combinations with one code path.</p>
     *
     * @param userId    the owning user's id
     * @param company   optional case-insensitive substring match on company name
     * @param priority  optional exact priority match
     * @param startDate optional inclusive lower bound on {@code appliedDate}
     * @param endDate   optional inclusive upper bound on {@code appliedDate}
     * @return matching applications, sorted by columnId then order ascending
     */
    public List<ApplicationResponse> listApplications(
            String userId,
            String company,
            Priority priority,
            LocalDate startDate,
            LocalDate endDate
    ) {
        Criteria criteria = Criteria.where("userId").is(userId);

        if (company != null && !company.isBlank()) {
            // Pattern.quote escapes the caller's raw input so it's matched
            // literally rather than interpreted as a regex — passing
            // unescaped user input into .regex() is an injection/DoS
            // surface (e.g. a crafted pattern causing catastrophic
            // backtracking), so every substring filter must be quoted.
            criteria = criteria.and("company").regex(Pattern.quote(company), "i");
        }

        if (priority != null) {
            criteria = criteria.and("priority").is(priority);
        }

        if (startDate != null && endDate != null) {
            criteria = criteria.and("appliedDate").gte(startDate).lte(endDate);
        } else if (startDate != null) {
            criteria = criteria.and("appliedDate").gte(startDate);
        } else if (endDate != null) {
            criteria = criteria.and("appliedDate").lte(endDate);
        }

        Query query = Query.query(criteria)
                .with(Sort.by(Sort.Order.asc("columnId"), Sort.Order.asc("order")));

        return mongoTemplate.find(query, Application.class)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates a new application card for the given user, appended to the
     * end of the requested column.
     *
     * @param userId  the owning user's id
     * @param request the new card's fields, including the destination column
     * @return the created application
     * @throws ResourceNotFoundException if the requested column doesn't exist or belongs to a different user
     */
    public ApplicationResponse createApplication(String userId, ApplicationRequest request) {
        // Verify the destination column exists and belongs to this user
        // before ever touching the applications collection — a card can
        // never be created into a nonexistent or someone else's column.
        assertColumnOwnedByUser(userId, request.columnId());

        // Append-at-end within the destination column: one more than the
        // highest existing order there, or 0 if it's the first card —
        // same pattern as Task 3's column append-order logic.
        int order = applicationRepository
                .findFirstByUserIdAndColumnIdOrderByOrderDesc(userId, request.columnId())
                .map(a -> a.getOrder() + 1)
                .orElse(0);

        Instant now = Instant.now();
        Application application = Application.builder()
                .userId(userId)
                .columnId(request.columnId())
                .company(request.company())
                .role(request.role())
                .jobUrl(request.jobUrl())
                .location(request.location())
                .salaryRange(request.salaryRange())
                .appliedDate(request.appliedDate())
                .followUpDate(request.followUpDate())
                .priority(request.priority())
                .notes(request.notes())
                .order(order)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Application saved = applicationRepository.save(application);
        log.info("Application created: id={}, company={}, columnId={}", saved.getId(), saved.getCompany(), saved.getColumnId());
        return toResponse(saved);
    }

    /**
     * Fully edits an existing application's fields.
     *
     * <p>Deliberately does NOT change {@code columnId} or {@code order},
     * even though {@code request} carries a {@code columnId} (required for
     * create). Moving a card between columns is exclusively the job of
     * {@link #moveApplication}, keeping a single code path responsible for
     * column/order changes — this mirrors why drag-and-drop and the
     * application detail edit modal are separate actions in the frontend.</p>
     *
     * @param userId        the owning user's id, used to enforce ownership
     * @param applicationId the application to update
     * @param request       the new field values (columnId is ignored)
     * @return the updated application
     * @throws ResourceNotFoundException if the application doesn't exist or belongs to a different user
     */
    public ApplicationResponse updateApplication(String userId, String applicationId, ApplicationRequest request) {
        Application application = findOwnedApplication(userId, applicationId);

        application.setCompany(request.company());
        application.setRole(request.role());
        application.setJobUrl(request.jobUrl());
        application.setLocation(request.location());
        application.setSalaryRange(request.salaryRange());
        application.setAppliedDate(request.appliedDate());
        application.setFollowUpDate(request.followUpDate());
        application.setPriority(request.priority());
        application.setNotes(request.notes());
        application.setUpdatedAt(Instant.now());

        Application saved = applicationRepository.save(application);
        log.info("Application updated: id={}", saved.getId());
        return toResponse(saved);
    }

    /**
     * Moves a card to a (possibly different) column and position, exactly
     * as requested — no shifting/renumbering of sibling applications'
     * order values, since the frontend does optimistic full-board state
     * management and sends the final position for every affected card
     * itself (same "accept the given order verbatim" approach Task 3 used
     * for columns).
     *
     * @param userId        the owning user's id, used to enforce ownership
     * @param applicationId the application to move
     * @param request       the destination column and order
     * @throws ResourceNotFoundException if the application doesn't exist/isn't owned, or the destination column doesn't exist/isn't owned
     */
    public void moveApplication(String userId, String applicationId, MoveApplicationRequest request) {
        Application application = findOwnedApplication(userId, applicationId);
        // Can't move into someone else's column or a nonexistent one.
        assertColumnOwnedByUser(userId, request.columnId());

        application.setColumnId(request.columnId());
        application.setOrder(request.order());
        application.setUpdatedAt(Instant.now());
        applicationRepository.save(application);
        log.info("Application moved: id={}, newColumnId={}, newOrder={}", applicationId, request.columnId(), request.order());
    }

    /**
     * Deletes an application card.
     *
     * @param userId        the owning user's id, used to enforce ownership
     * @param applicationId the application to delete
     * @throws ResourceNotFoundException if the application doesn't exist or belongs to a different user
     */
    public void deleteApplication(String userId, String applicationId) {
        Application application = findOwnedApplication(userId, applicationId);
        applicationRepository.delete(application);
        log.info("Application deleted: id={}", applicationId);
    }

    /**
     * Looks up an application and enforces ownership in one step so that a
     * missing application and one owned by someone else are indistinguishable
     * to the caller — both surface as a 404, never a 403 that would leak
     * the application's existence.
     */
    private Application findOwnedApplication(String userId, String applicationId) {
        return applicationRepository.findByIdAndUserId(applicationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
    }

    /** Confirms a column exists and belongs to {@code userId}; 404s otherwise (never leaks existence via 403). */
    private void assertColumnOwnedByUser(String userId, String columnId) {
        columnRepository.findByIdAndUserId(columnId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Column not found"));
    }

    private ApplicationResponse toResponse(Application application) {
        return new ApplicationResponse(
                application.getId(),
                application.getUserId(),
                application.getColumnId(),
                application.getCompany(),
                application.getRole(),
                application.getJobUrl(),
                application.getLocation(),
                application.getSalaryRange(),
                application.getAppliedDate(),
                application.getFollowUpDate(),
                application.getPriority(),
                application.getNotes(),
                application.getOrder(),
                application.getCreatedAt(),
                application.getUpdatedAt()
        );
    }
}
