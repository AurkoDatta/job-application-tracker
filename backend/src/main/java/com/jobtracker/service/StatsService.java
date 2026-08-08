package com.jobtracker.service;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.DateOperators;
import org.springframework.data.mongodb.core.aggregation.DateOperators.Timezone;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import com.jobtracker.dto.stats.ColumnCount;
import com.jobtracker.dto.stats.FunnelStats;
import com.jobtracker.dto.stats.PeriodCount;
import com.jobtracker.dto.stats.StatsResponse;
import com.jobtracker.model.Application;
import com.jobtracker.model.Column;
import com.jobtracker.repository.ColumnRepository;

/**
 * Computes the analytics payload behind {@code GET /api/stats}.
 *
 * <p>All counting and grouping is pushed into MongoDB aggregation
 * pipelines via {@link MongoTemplate} — this service never loads a user's
 * {@code Application} documents and tallies them in a Java loop. That is a
 * standing project convention (see {@code claude.md}) and it matters here
 * for a practical reason: the board is the one collection that grows
 * without bound per user, and the stats page would otherwise pull every
 * card over the wire just to produce five small numbers.</p>
 *
 * <p>Exactly two round trips are made per request, no matter how many
 * applications exist: one {@code $group}-by-column pipeline (which feeds
 * {@code perColumn}, {@code statusDistribution}, {@code totalApplications}
 * and the whole conversion funnel) and one {@code $dateTrunc} pipeline for
 * the weekly breakdown. The user's column list is read separately because
 * the response must include columns holding zero applications, and a
 * {@code $group} over applications structurally cannot produce a bucket for
 * a column no application points at.</p>
 */
@Service
public class StatsService {

    /**
     * Funnel stage names, matched case-sensitively against column names.
     * These mirror the columns created by
     * {@code ColumnService.seedDefaultColumns} — if that seed list ever
     * changes, these must change with it.
     */
    private static final String STAGE_WISHLIST = "Wishlist";
    private static final String STAGE_APPLIED = "Applied";
    private static final String STAGE_INTERVIEW = "Interview";
    private static final String STAGE_OFFER = "Offer";
    private static final String STAGE_REJECTED = "Rejected";

    /**
     * {@code $dateToString} format producing an ISO-8601 year-week label
     * such as {@code "2026-W32"}. {@code %G} is the ISO week-numbering
     * year (not {@code %Y}, the calendar year) and {@code %V} the
     * zero-padded ISO week number, so the label agrees with the
     * Monday-based week buckets below even across a New Year boundary.
     */
    private static final String ISO_WEEK_LABEL_FORMAT = "%G-W%V";

    private final MongoTemplate mongoTemplate;
    private final ColumnRepository columnRepository;

    public StatsService(MongoTemplate mongoTemplate, ColumnRepository columnRepository) {
        this.mongoTemplate = mongoTemplate;
        this.columnRepository = columnRepository;
    }

    /**
     * Builds the complete analytics snapshot for one user.
     *
     * <p>A user with zero applications is a normal case and yields zeroed
     * stats (with every column still listed at {@code count} 0), never an
     * error — the analytics page is reachable the moment an account is
     * created.</p>
     *
     * @param userId the authenticated user's id; every pipeline is scoped to it
     * @return the fully computed stats payload
     */
    public StatsResponse getStats(String userId) {
        List<Column> columns = columnRepository.findByUserIdOrderByOrderAsc(userId);
        Map<String, Long> countsByColumnId = countApplicationsByColumnId(userId);

        List<ColumnCount> perColumn = toColumnCounts(columns, countsByColumnId);

        // Summed from the aggregation's own buckets rather than issuing a
        // separate count: it's already an exact per-user total, and unlike
        // summing `perColumn` it still includes any application whose column
        // was deleted (column deletion doesn't cascade to cards), so the
        // headline total can never silently under-report.
        long totalApplications = countsByColumnId.values().stream().mapToLong(Long::longValue).sum();

        // perColumn is handed to statusDistribution as the same list: the two
        // fields are the same data under two names (see StatsResponse), and
        // re-running the aggregation for the second one would be pure waste.
        return new StatsResponse(
                totalApplications,
                perColumn,
                computeFunnel(perColumn),
                computePerPeriod(userId),
                perColumn
        );
    }

    /**
     * Counts the user's applications grouped by the column they currently
     * sit in.
     *
     * <p>Returns a raw {@code columnId -> count} map rather than a DTO
     * because two different consumers need it: the left-join that produces
     * {@code perColumn}, and the grand total.</p>
     *
     * @param userId the owning user's id
     * @return counts keyed by columnId; columns with no applications are absent
     */
    private Map<String, Long> countApplicationsByColumnId(String userId) {
        Aggregation aggregation = Aggregation.newAggregation(
                // Scope to the one user first. This is both a correctness
                // requirement (stats must never leak across accounts) and the
                // only stage that can use an index, so it must stay first —
                // every later stage then works on a single board's documents.
                Aggregation.match(Criteria.where("userId").is(userId)),

                // Group key is columnId, because "which stage is this card in"
                // is the single fact every column-shaped stat in the response
                // (perColumn, statusDistribution, and the funnel via column
                // name) is derived from. Counting here means the server
                // returns at most one small document per column instead of
                // one per application.
                Aggregation.group("columnId").count().as("count")
        );

        Map<String, Long> countsByColumnId = new HashMap<>();
        for (Document result : mongoTemplate.aggregate(aggregation, Application.class, Document.class)) {
            // `_id` is the group key, i.e. the columnId.
            countsByColumnId.put(result.getString("_id"), toLong(result.get("count")));
        }
        return countsByColumnId;
    }

    /**
     * Left-joins the user's full column list against the aggregation's
     * counts, in board display order.
     *
     * <p>Driving the loop from {@code columns} (not from the aggregation
     * result) is what guarantees empty columns appear with {@code count} 0
     * — the aggregation only knows about columns that actually hold
     * cards.</p>
     */
    private List<ColumnCount> toColumnCounts(List<Column> columns, Map<String, Long> countsByColumnId) {
        List<ColumnCount> columnCounts = new ArrayList<>(columns.size());
        for (Column column : columns) {
            columnCounts.add(new ColumnCount(
                    column.getId(),
                    column.getName(),
                    countsByColumnId.getOrDefault(column.getId(), 0L)
            ));
        }
        return columnCounts;
    }

    /**
     * Derives the conversion funnel from the already-computed per-column
     * counts.
     *
     * <p>No extra query is issued: the funnel is just the per-column
     * counts re-keyed from column id to the five default stage names, so
     * the actual counting still happened in the {@code $group} pipeline.
     * The only arithmetic done in Java is the two division-safe rates.</p>
     */
    private FunnelStats computeFunnel(List<ColumnCount> perColumn) {
        long wishlistCount = countForStage(perColumn, STAGE_WISHLIST);
        long appliedCount = countForStage(perColumn, STAGE_APPLIED);
        long interviewCount = countForStage(perColumn, STAGE_INTERVIEW);
        long offerCount = countForStage(perColumn, STAGE_OFFER);
        long rejectedCount = countForStage(perColumn, STAGE_REJECTED);

        return new FunnelStats(
                wishlistCount,
                appliedCount,
                interviewCount,
                offerCount,
                rejectedCount,
                rate(interviewCount, appliedCount),
                rate(offerCount, interviewCount)
        );
    }

    /**
     * Total applications sitting in columns with the given stage name.
     *
     * <p>Sums rather than taking the first match: nothing stops a user from
     * creating a second column also called "Applied", and quietly ignoring
     * the duplicate would under-report that stage. A renamed or deleted
     * default column simply contributes nothing, yielding 0.</p>
     */
    private long countForStage(List<ColumnCount> perColumn, String stageName) {
        return perColumn.stream()
                .filter(columnCount -> stageName.equals(columnCount.columnName()))
                .mapToLong(ColumnCount::count)
                .sum();
    }

    /** Conversion rate guarded against an empty upstream stage — 0.0 rather than a division-by-zero NaN/Infinity, which wouldn't even serialise cleanly to JSON. */
    private double rate(long reached, long from) {
        return from == 0 ? 0.0 : (double) reached / from;
    }

    /**
     * Counts the user's applications per ISO week of submission.
     *
     * @param userId the owning user's id
     * @return one entry per week that has at least one submitted
     *         application, chronologically ascending
     */
    private List<PeriodCount> computePerPeriod(String userId) {
        // `appliedDate` is a LocalDate, which Spring Data stores as a BSON
        // date at midnight *in the JVM's default zone*. The date operators
        // below must therefore bucket in that same zone, otherwise a date
        // written as 2026-08-03 could be truncated back out as belonging to
        // the previous day — and so possibly the previous week.
        Timezone storageZone = Timezone.valueOf(ZoneId.systemDefault().getId());

        Aggregation aggregation = Aggregation.newAggregation(
                // Same index-backed user scoping as above, plus the null
                // filter: an application with no appliedDate was never
                // actually submitted, so it belongs in no week at all.
                // Excluding it here (rather than after grouping) also keeps
                // $dateTrunc from ever receiving null.
                Aggregation.match(Criteria.where("userId").is(userId).and("appliedDate").ne(null)),

                // $dateTrunc collapses each appliedDate to the Monday that
                // starts its week. Truncating to a real date (rather than
                // grouping on a formatted week string directly) keeps the
                // group key temporally ordered, so the $sort below is a true
                // chronological sort instead of a string comparison that only
                // happens to agree.
                Aggregation.project()
                        .and(DateOperators.zonedDateOf("appliedDate", storageZone)
                                .truncate("week")
                                .startOfWeek(DayOfWeek.MONDAY))
                        .as("weekStart"),

                Aggregation.group("weekStart").count().as("count"),

                // Sorted server side so the frontend can plot the array in
                // received order; a chart's x-axis is meaningless unsorted.
                Aggregation.sort(Sort.Direction.ASC, "_id"),

                // Only now is the bucket turned into a display label. Feeding
                // $dateToString the truncated Monday (not the raw
                // appliedDate) makes the label and the bucket definitionally
                // the same week.
                Aggregation.project("count")
                        .and(DateOperators.zonedDateOf("_id", storageZone).toString(ISO_WEEK_LABEL_FORMAT))
                        .as("periodLabel")
                        .andExclude("_id")
        );

        List<PeriodCount> perPeriod = new ArrayList<>();
        for (Document result : mongoTemplate.aggregate(aggregation, Application.class, Document.class)) {
            perPeriod.add(new PeriodCount(result.getString("periodLabel"), toLong(result.get("count"))));
        }
        return perPeriod;
    }

    /** MongoDB returns {@code $sum} results as Integer or Long depending on magnitude; normalise to long. */
    private long toLong(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }
}
