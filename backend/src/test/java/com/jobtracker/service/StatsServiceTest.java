package com.jobtracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;

import com.jobtracker.dto.stats.ColumnCount;
import com.jobtracker.dto.stats.StatsResponse;
import com.jobtracker.model.Application;
import com.jobtracker.model.Column;
import com.jobtracker.repository.ColumnRepository;

/**
 * Unit tests for {@link StatsService}. {@code getStats} makes exactly two
 * {@code MongoTemplate.aggregate} calls per the class's own Javadoc (one
 * $group-by-column pipeline feeding perColumn/statusDistribution/funnel/
 * total, one $dateTrunc weekly pipeline) — both use the same
 * {@code aggregate(Aggregation, Application.class, Document.class)}
 * signature, so consecutive stubbing (first call = column grouping, second
 * = weekly grouping) is used to target each independently, matching the
 * method's documented call order.
 */
@ExtendWith(MockitoExtension.class)
class StatsServiceTest {

    @Mock
    private MongoTemplate mongoTemplate;

    @Mock
    private ColumnRepository columnRepository;

    private StatsService statsService;

    @BeforeEach
    void setUp() {
        statsService = new StatsService(mongoTemplate, columnRepository);
    }

    private AggregationResults<Document> resultsOf(Document... documents) {
        return new AggregationResults<>(List.of(documents), new Document());
    }

    private Document groupResult(String id, long count) {
        return new Document("_id", id).append("count", count);
    }

    private List<Column> defaultColumns(String userId) {
        return List.of(
                Column.builder().id("col-wishlist").userId(userId).name("Wishlist").order(0).build(),
                Column.builder().id("col-applied").userId(userId).name("Applied").order(1).build(),
                Column.builder().id("col-interview").userId(userId).name("Interview").order(2).build(),
                Column.builder().id("col-offer").userId(userId).name("Offer").order(3).build(),
                Column.builder().id("col-rejected").userId(userId).name("Rejected").order(4).build()
        );
    }

    @Test
    void getStats_zeroApplications_returnsFullyZeroedStatsWithoutThrowing() {
        when(columnRepository.findByUserIdOrderByOrderAsc("user-1")).thenReturn(defaultColumns("user-1"));
        when(mongoTemplate.aggregate(any(Aggregation.class), eq(Application.class), eq(Document.class)))
                .thenReturn(resultsOf(), resultsOf());

        StatsResponse response = statsService.getStats("user-1");

        assertThat(response.totalApplications()).isZero();
        assertThat(response.perColumn()).hasSize(5);
        assertThat(response.perColumn()).allSatisfy(columnCount -> assertThat(columnCount.count()).isZero());
        assertThat(response.statusDistribution()).isEqualTo(response.perColumn());
        assertThat(response.perPeriod()).isEmpty();

        assertThat(response.conversionFunnel().wishlistCount()).isZero();
        assertThat(response.conversionFunnel().appliedCount()).isZero();
        assertThat(response.conversionFunnel().interviewCount()).isZero();
        assertThat(response.conversionFunnel().offerCount()).isZero();
        assertThat(response.conversionFunnel().rejectedCount()).isZero();
        assertThat(response.conversionFunnel().appliedToInterviewRate()).isEqualTo(0.0);
        assertThat(response.conversionFunnel().interviewToOfferRate()).isEqualTo(0.0);
    }

    /**
     * Exercises the funnel rate helper's division-by-zero guard (appliedCount
     * is 0, so appliedToInterviewRate must be exactly 0.0, not NaN/Infinity)
     * and its normal-division path (offerCount 2 / interviewCount 5 = 0.4)
     * in the same test, since both paths are driven by the same aggregation
     * result shape.
     */
    @Test
    void getStats_funnelRates_zeroDenominatorIsZeroAndNormalDivisionComputesCorrectly() {
        when(columnRepository.findByUserIdOrderByOrderAsc("user-1")).thenReturn(defaultColumns("user-1"));
        // appliedCount = 0 (no "Applied" bucket at all) => appliedToInterviewRate must be 0.0.
        // interviewCount = 5, offerCount = 2 => interviewToOfferRate must be 2/5 = 0.4.
        when(mongoTemplate.aggregate(any(Aggregation.class), eq(Application.class), eq(Document.class)))
                .thenReturn(
                        resultsOf(
                                groupResult("col-interview", 5),
                                groupResult("col-offer", 2)
                        ),
                        resultsOf()
                );

        StatsResponse response = statsService.getStats("user-1");

        assertThat(response.conversionFunnel().appliedCount()).isZero();
        assertThat(response.conversionFunnel().appliedToInterviewRate()).isEqualTo(0.0);
        assertThat(response.conversionFunnel().interviewCount()).isEqualTo(5);
        assertThat(response.conversionFunnel().offerCount()).isEqualTo(2);
        assertThat(response.conversionFunnel().interviewToOfferRate()).isEqualTo(0.4);
    }

    /**
     * Verifies the zero-fill left join: the aggregation result only covers
     * SOME of the user's columns (Applied and Interview), but the response
     * must still list every column the user owns, with the absent ones
     * (Wishlist/Offer/Rejected) reported at count 0 rather than omitted.
     */
    @Test
    void getStats_perColumn_zeroFillsColumnsAbsentFromAggregationResult() {
        when(columnRepository.findByUserIdOrderByOrderAsc("user-1")).thenReturn(defaultColumns("user-1"));
        when(mongoTemplate.aggregate(any(Aggregation.class), eq(Application.class), eq(Document.class)))
                .thenReturn(
                        resultsOf(
                                groupResult("col-applied", 3),
                                groupResult("col-interview", 1)
                        ),
                        resultsOf()
                );

        StatsResponse response = statsService.getStats("user-1");

        assertThat(response.perColumn()).hasSize(5);
        assertThat(response.perColumn()).extracting(ColumnCount::columnName)
                .containsExactly("Wishlist", "Applied", "Interview", "Offer", "Rejected");

        assertThat(findCount(response.perColumn(), "Wishlist")).isZero();
        assertThat(findCount(response.perColumn(), "Applied")).isEqualTo(3);
        assertThat(findCount(response.perColumn(), "Interview")).isEqualTo(1);
        assertThat(findCount(response.perColumn(), "Offer")).isZero();
        assertThat(findCount(response.perColumn(), "Rejected")).isZero();

        assertThat(response.totalApplications()).isEqualTo(4);
    }

    private long findCount(List<ColumnCount> columnCounts, String columnName) {
        return columnCounts.stream()
                .filter(cc -> cc.columnName().equals(columnName))
                .findFirst()
                .orElseThrow()
                .count();
    }
}
