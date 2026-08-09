package com.jobtracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.jobtracker.dto.column.ColumnRequest;
import com.jobtracker.dto.column.ColumnResponse;
import com.jobtracker.exception.ResourceNotFoundException;
import com.jobtracker.model.Column;
import com.jobtracker.repository.ColumnRepository;

/**
 * Unit tests for {@link ColumnService}: append-order computation on create,
 * ownership-scoped rename/reorder and delete, and default-column seeding.
 */
@ExtendWith(MockitoExtension.class)
class ColumnServiceTest {

    @Mock
    private ColumnRepository columnRepository;

    private ColumnService columnService;

    @BeforeEach
    void setUp() {
        columnService = new ColumnService(columnRepository);
    }

    @Test
    void createColumn_noExplicitOrder_appendsAtMaxExistingOrderPlusOne() {
        when(columnRepository.findFirstByUserIdOrderByOrderDesc("user-1"))
                .thenReturn(Optional.of(Column.builder().id("col-1").userId("user-1").name("Offer").order(3).build()));
        when(columnRepository.save(any(Column.class))).thenAnswer(invocation -> {
            Column column = invocation.getArgument(0);
            column.setId("new-col");
            return column;
        });

        ColumnResponse response = columnService.createColumn("user-1", new ColumnRequest("Custom", null));

        assertThat(response.order()).isEqualTo(4);
    }

    @Test
    void createColumn_userHasNoExistingColumns_ordersAtZero() {
        when(columnRepository.findFirstByUserIdOrderByOrderDesc("user-1")).thenReturn(Optional.empty());
        when(columnRepository.save(any(Column.class))).thenAnswer(invocation -> {
            Column column = invocation.getArgument(0);
            column.setId("new-col");
            return column;
        });

        ColumnResponse response = columnService.createColumn("user-1", new ColumnRequest("First Column", null));

        assertThat(response.order()).isEqualTo(0);
    }

    @Test
    void createColumn_explicitOrder_usedVerbatimWithNoShifting() {
        when(columnRepository.save(any(Column.class))).thenAnswer(invocation -> {
            Column column = invocation.getArgument(0);
            column.setId("new-col");
            return column;
        });

        ColumnResponse response = columnService.createColumn("user-1", new ColumnRequest("Custom", 7));

        assertThat(response.order()).isEqualTo(7);
        // An explicit order must skip the append-order lookup entirely — no
        // other column's order is read or shifted.
        verify(columnRepository, never()).findFirstByUserIdOrderByOrderDesc(any());
    }

    @Test
    void renameOrReorderColumn_notOwned_throwsResourceNotFoundException() {
        when(columnRepository.findByIdAndUserId("col-1", "user-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                columnService.renameOrReorderColumn("user-1", "col-1", new ColumnRequest("New Name", 2)))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(columnRepository, never()).save(any(Column.class));
    }

    @Test
    void renameOrReorderColumn_success_updatesFields() {
        Column existing = Column.builder().id("col-1").userId("user-1").name("Old Name").order(1).build();
        when(columnRepository.findByIdAndUserId("col-1", "user-1")).thenReturn(Optional.of(existing));
        when(columnRepository.save(any(Column.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ColumnResponse response =
                columnService.renameOrReorderColumn("user-1", "col-1", new ColumnRequest("New Name", 5));

        assertThat(response.name()).isEqualTo("New Name");
        assertThat(response.order()).isEqualTo(5);
    }

    @Test
    void deleteColumn_notOwned_throwsResourceNotFoundException() {
        when(columnRepository.findByIdAndUserId("col-1", "user-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> columnService.deleteColumn("user-1", "col-1"))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(columnRepository, never()).delete(any(Column.class));
    }

    @Test
    void deleteColumn_success_callsRepositoryDelete() {
        Column existing = Column.builder().id("col-1").userId("user-1").name("Wishlist").order(0).build();
        when(columnRepository.findByIdAndUserId("col-1", "user-1")).thenReturn(Optional.of(existing));

        columnService.deleteColumn("user-1", "col-1");

        verify(columnRepository).delete(existing);
    }

    @Test
    void seedDefaultColumns_createsExactlyFiveColumnsInStandardOrder() {
        columnService.seedDefaultColumns("user-1");

        ArgumentCaptor<List<Column>> captor = ArgumentCaptor.forClass(List.class);
        verify(columnRepository, times(1)).saveAll(captor.capture());

        List<Column> saved = captor.getValue();
        assertThat(saved).hasSize(5);
        assertThat(saved).extracting(Column::getName)
                .containsExactly("Wishlist", "Applied", "Interview", "Offer", "Rejected");
        assertThat(saved).extracting(Column::getOrder)
                .containsExactly(0, 1, 2, 3, 4);
        assertThat(saved).allSatisfy(column -> assertThat(column.getUserId()).isEqualTo("user-1"));
    }
}
