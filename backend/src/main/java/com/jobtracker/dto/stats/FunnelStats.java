package com.jobtracker.dto.stats;

/**
 * The five default hiring stages, plus the two conversion rates between
 * them, for a single user.
 *
 * <p><strong>This is a snapshot funnel, not a historical one.</strong> The
 * app stores only an application's <em>current</em> {@code columnId} — no
 * column-transition history exists — so each count here means "applications
 * sitting in that stage right now", not "applications that ever reached
 * that stage". A card that went Applied &rarr; Interview &rarr; Offer
 * contributes to {@code offerCount} only.</p>
 *
 * <p>Buckets are matched by exact, case-sensitive column <em>name</em>
 * against the names seeded by {@code ColumnService.seedDefaultColumns}. If
 * a user renamed or deleted one of those columns, its bucket is simply 0 —
 * no fuzzy matching is attempted, since guessing which custom column is
 * "really" the interview stage would silently invent data.</p>
 *
 * @param wishlistCount          applications currently in a column named "Wishlist"
 * @param appliedCount           applications currently in a column named "Applied"
 * @param interviewCount         applications currently in a column named "Interview"
 * @param offerCount             applications currently in a column named "Offer"
 * @param rejectedCount          applications currently in a column named "Rejected"
 * @param appliedToInterviewRate {@code interviewCount / appliedCount}, or 0.0 when {@code appliedCount} is 0
 * @param interviewToOfferRate   {@code offerCount / interviewCount}, or 0.0 when {@code interviewCount} is 0
 */
public record FunnelStats(
        long wishlistCount,
        long appliedCount,
        long interviewCount,
        long offerCount,
        long rejectedCount,
        double appliedToInterviewRate,
        double interviewToOfferRate
) {
}
