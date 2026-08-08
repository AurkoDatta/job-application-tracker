package com.jobtracker.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.jobtracker.dto.application.ApplicationRequest;
import com.jobtracker.dto.application.ApplicationResponse;
import com.jobtracker.dto.application.MoveApplicationRequest;
import com.jobtracker.model.Priority;
import com.jobtracker.security.CustomUserDetails;
import com.jobtracker.service.ApplicationService;

import jakarta.validation.Valid;

/**
 * Thin REST layer for a user's job application cards. All business logic
 * (ownership checks, filter-query assembly, order computation) lives in
 * {@link ApplicationService}; this controller only resolves the
 * authenticated user, binds request params, and delegates.
 *
 * <p>Every endpoint here requires authentication, already enforced
 * globally by {@code SecurityConfig} for everything under {@code /api/**}
 * except {@code /api/auth/**}.</p>
 */
@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    /**
     * Lists the current user's applications, optionally filtered.
     *
     * <p>{@code priority} is bound directly as a {@link Priority} so Spring
     * attempts enum conversion during request binding; an invalid value
     * (e.g. {@code ?priority=URGENT}) throws
     * {@code MethodArgumentTypeMismatchException} before this method body
     * runs, which {@code GlobalExceptionHandler} maps to a 400.</p>
     */
    @GetMapping
    public ResponseEntity<List<ApplicationResponse>> listApplications(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam(required = false) String company,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ResponseEntity.ok(applicationService.listApplications(
                currentUserId(principal), company, priority, startDate, endDate));
    }

    /** Creates a new application card for the current user. */
    @PostMapping
    public ResponseEntity<ApplicationResponse> createApplication(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ApplicationRequest request
    ) {
        ApplicationResponse created = applicationService.createApplication(currentUserId(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** Fully edits an application owned by the current user; never moves it between columns. */
    @PutMapping("/{id}")
    public ResponseEntity<ApplicationResponse> updateApplication(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @Valid @RequestBody ApplicationRequest request
    ) {
        return ResponseEntity.ok(applicationService.updateApplication(currentUserId(principal), id, request));
    }

    /** Moves an application owned by the current user to a new column/position (drag-and-drop). */
    @PatchMapping("/{id}/move")
    public ResponseEntity<Void> moveApplication(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @Valid @RequestBody MoveApplicationRequest request
    ) {
        applicationService.moveApplication(currentUserId(principal), id, request);
        return ResponseEntity.ok().build();
    }

    /** Deletes an application owned by the current user. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id
    ) {
        applicationService.deleteApplication(currentUserId(principal), id);
        return ResponseEntity.noContent().build();
    }

    /** Extracts the authenticated user's id from the security-context principal populated by {@code JwtAuthFilter}. */
    private String currentUserId(CustomUserDetails principal) {
        return principal.getUser().getId();
    }
}
