package com.jobtracker.dto.stats;

/**
 * How many applications a user submitted in one calendar week.
 *
 * <p><strong>{@code periodLabel} format: ISO-8601 year-week,
 * {@code "yyyy-'W'ww"} — e.g. {@code "2026-W32"}.</strong> Produced server
 * side by MongoDB's {@code $dateToString} with the {@code "%G-W%V"} format
 * (ISO week-numbering year + zero-padded ISO week number), so weeks are
 * Monday-based and the label of a week that straddles New Year belongs to
 * the ISO year that owns the majority of its days — {@code %G} is
 * deliberately used instead of {@code %Y} to avoid the classic
 * "2025-W01"-vs-"2026-W01" off-by-one at year boundaries.</p>
 *
 * <p>The format is fixed-width and zero-padded, so it also sorts
 * lexicographically in chronological order — convenient for a chart's
 * category axis, which consumes these labels verbatim.</p>
 *
 * <p>Counts are based on {@code appliedDate}, not {@code createdAt}: this
 * breakdown answers "how hard was I job-hunting that week", which is about
 * when the application was actually submitted, not when the card happened
 * to be typed into the board. Applications with no {@code appliedDate} are
 * excluded from this breakdown entirely (they were never submitted), so the
 * counts here can legitimately sum to less than
 * {@code StatsResponse.totalApplications}.</p>
 *
 * @param periodLabel ISO year-week label, e.g. {@code "2026-W32"}
 * @param count       applications whose {@code appliedDate} falls in that week
 */
public record PeriodCount(
        String periodLabel,
        long count
) {
}
