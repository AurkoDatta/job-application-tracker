package com.jobtracker.dto.application;

import java.time.Instant;
import java.time.LocalDate;

import com.jobtracker.model.Priority;

/**
 * Response body for application endpoints.
 *
 * @param id           the application's id
 * @param userId       the owning user's id
 * @param columnId     the column this card currently sits in
 * @param company      the company name
 * @param role         the job title/role
 * @param jobUrl       an optional link to the job posting
 * @param location     an optional job location
 * @param salaryRange  an optional free-text salary range
 * @param appliedDate  the date the application was submitted, if any
 * @param followUpDate the date a follow-up is due, if any
 * @param priority     the user-assigned priority
 * @param notes        optional free-text notes
 * @param order        the card's display position within {@code columnId}
 * @param createdAt    when the card was created
 * @param updatedAt    when the card was last updated
 */
public record ApplicationResponse(
        String id,
        String userId,
        String columnId,
        String company,
        String role,
        String jobUrl,
        String location,
        String salaryRange,
        LocalDate appliedDate,
        LocalDate followUpDate,
        Priority priority,
        String notes,
        int order,
        Instant createdAt,
        Instant updatedAt
) {
}
