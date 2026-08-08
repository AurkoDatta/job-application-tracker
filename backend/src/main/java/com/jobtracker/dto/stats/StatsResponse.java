package com.jobtracker.dto.stats;

import java.util.List;

/**
 * Full payload of {@code GET /api/stats} — everything the analytics page
 * renders, computed in one request so the frontend never has to stitch
 * several endpoints together.
 *
 * <p>A user with no applications is a normal case, not an error: every
 * count comes back 0, {@code perColumn} still lists all of the user's
 * columns, and {@code perPeriod} is simply empty.</p>
 *
 * @param totalApplications  total applications the user owns
 * @param perColumn          one entry per column the user owns, including empty columns
 * @param conversionFunnel   the five default stages and the two conversion rates
 * @param perPeriod          applications submitted per ISO week, chronologically ascending
 * @param statusDistribution the same data as {@code perColumn}, exposed under the name the
 *                           analytics page's pie chart consumes; identical by design (see below)
 */
public record StatsResponse(
        long totalApplications,
        List<ColumnCount> perColumn,
        FunnelStats conversionFunnel,
        List<PeriodCount> perPeriod,

        /*
         * statusDistribution intentionally carries the same values as
         * perColumn. The plan's analytics page draws these as two different
         * visualisations (a per-column bar chart and a status pie chart),
         * and naming them separately keeps the frontend from hard-coding
         * "the pie chart reads the bar chart's field". The service computes
         * the list once and reuses the same instance for both — the
         * aggregation is never run twice.
         */
        List<ColumnCount> statusDistribution
) {
}
