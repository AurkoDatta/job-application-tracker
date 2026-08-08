package com.jobtracker.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jobtracker.dto.column.ColumnRequest;
import com.jobtracker.dto.column.ColumnResponse;
import com.jobtracker.security.CustomUserDetails;
import com.jobtracker.service.ColumnService;

import jakarta.validation.Valid;

/**
 * Thin REST layer for a user's Kanban columns. All business logic
 * (ownership checks, order computation) lives in {@link ColumnService};
 * this controller only resolves the authenticated user and delegates.
 *
 * <p>Every endpoint here requires authentication, already enforced
 * globally by {@code SecurityConfig} for everything under {@code /api/**}
 * except {@code /api/auth/**}.</p>
 */
@RestController
@RequestMapping("/api/columns")
public class ColumnController {

    private final ColumnService columnService;

    public ColumnController(ColumnService columnService) {
        this.columnService = columnService;
    }

    /** Returns the current user's columns, ordered by display position. */
    @GetMapping
    public ResponseEntity<List<ColumnResponse>> getColumns(@AuthenticationPrincipal CustomUserDetails principal) {
        return ResponseEntity.ok(columnService.getColumnsForUser(currentUserId(principal)));
    }

    /** Creates a new column for the current user. */
    @PostMapping
    public ResponseEntity<ColumnResponse> createColumn(
            @AuthenticationPrincipal CustomUserDetails principal,
            @Valid @RequestBody ColumnRequest request
    ) {
        ColumnResponse created = columnService.createColumn(currentUserId(principal), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /** Renames and/or reorders a column owned by the current user. */
    @PutMapping("/{id}")
    public ResponseEntity<ColumnResponse> updateColumn(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id,
            @Valid @RequestBody ColumnRequest request
    ) {
        return ResponseEntity.ok(columnService.renameOrReorderColumn(currentUserId(principal), id, request));
    }

    /** Deletes a column owned by the current user. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteColumn(
            @AuthenticationPrincipal CustomUserDetails principal,
            @PathVariable String id
    ) {
        columnService.deleteColumn(currentUserId(principal), id);
        return ResponseEntity.noContent().build();
    }

    /** Extracts the authenticated user's id from the security-context principal populated by {@code JwtAuthFilter}. */
    private String currentUserId(CustomUserDetails principal) {
        return principal.getUser().getId();
    }
}
