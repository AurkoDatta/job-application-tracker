package com.jobtracker.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jobtracker.dto.stats.StatsResponse;
import com.jobtracker.security.CustomUserDetails;
import com.jobtracker.service.StatsService;

import lombok.extern.slf4j.Slf4j;

/**
 * Thin REST layer for the analytics page. All computation lives in
 * {@link StatsService}'s aggregation pipelines; this controller only
 * resolves the authenticated user and delegates.
 *
 * <p>Read-only and always successful for an authenticated caller — a user
 * with no applications gets zeroed stats, not a 404. Authentication itself
 * is enforced globally by {@code SecurityConfig} for everything under
 * {@code /api/**} except {@code /api/auth/**}.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    /** Returns the current user's full analytics snapshot. */
    @GetMapping
    public ResponseEntity<StatsResponse> getStats(@AuthenticationPrincipal CustomUserDetails principal) {
        String userId = currentUserId(principal);
        // DEBUG, not INFO: this is a read-heavy, low-business-value endpoint
        // (the frontend polls/re-renders analytics often) — logging every
        // view at INFO would just be noise, unlike the business-event logs
        // in the service layer which mark actual state mutations.
        log.debug("Stats requested for user {}", userId);
        return ResponseEntity.ok(statsService.getStats(userId));
    }

    /** Extracts the authenticated user's id from the security-context principal populated by {@code JwtAuthFilter}. */
    private String currentUserId(CustomUserDetails principal) {
        return principal.getUser().getId();
    }
}
