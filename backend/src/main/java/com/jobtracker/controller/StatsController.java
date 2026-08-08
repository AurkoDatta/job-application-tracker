package com.jobtracker.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jobtracker.dto.stats.StatsResponse;
import com.jobtracker.security.CustomUserDetails;
import com.jobtracker.service.StatsService;

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
        return ResponseEntity.ok(statsService.getStats(currentUserId(principal)));
    }

    /** Extracts the authenticated user's id from the security-context principal populated by {@code JwtAuthFilter}. */
    private String currentUserId(CustomUserDetails principal) {
        return principal.getUser().getId();
    }
}
