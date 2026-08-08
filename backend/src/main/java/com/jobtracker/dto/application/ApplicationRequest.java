package com.jobtracker.dto.application;

import java.time.LocalDate;

import com.jobtracker.model.Priority;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for creating or fully editing an application
 * ({@code POST /api/applications}, {@code PUT /api/applications/{id}}).
 *
 * <p>{@code columnId} is required by this DTO because it is needed on
 * create (it determines which column the new card is appended to), but it
 * is deliberately ignored by {@code ApplicationService#updateApplication} —
 * moving a card between columns is exclusively the job of the separate
 * {@code /move} endpoint, so a full edit via this DTO can never change a
 * card's column as a side effect.</p>
 *
 * <p>{@code jobUrl} is a plain nullable string with no format constraint.
 * A strict URL-shape check was considered but deliberately skipped: job
 * posting URLs in the wild are messy (tracking query params, non-standard
 * ports, occasionally a bare domain pasted without a scheme), and rejecting
 * those with a 400 would be more annoying than useful for a field that is
 * purely informational (never parsed/fetched by the backend). Format
 * validation, if ever wanted, belongs on the frontend as a soft hint.</p>
 *
 * @param columnId    the column to create the application in (create only; ignored on update)
 * @param company     the company name
 * @param role        the job title/role
 * @param jobUrl      an optional link to the job posting
 * @param location    an optional job location
 * @param salaryRange an optional free-text salary range
 * @param appliedDate the date the application was submitted, if any
 * @param followUpDate the date a follow-up is due, if any
 * @param priority    the user-assigned priority
 * @param notes       optional free-text notes
 */
public record ApplicationRequest(
        @NotBlank(message = "Column id is required")
        String columnId,

        @NotBlank(message = "Company is required")
        String company,

        @NotBlank(message = "Role is required")
        String role,

        String jobUrl,

        String location,

        String salaryRange,

        LocalDate appliedDate,

        LocalDate followUpDate,

        @NotNull(message = "Priority is required")
        Priority priority,

        String notes
) {
}
