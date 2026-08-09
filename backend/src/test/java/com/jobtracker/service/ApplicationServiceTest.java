package com.jobtracker.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import com.jobtracker.dto.application.ApplicationRequest;
import com.jobtracker.dto.application.ApplicationResponse;
import com.jobtracker.dto.application.MoveApplicationRequest;
import com.jobtracker.exception.ResourceNotFoundException;
import com.jobtracker.model.Application;
import com.jobtracker.model.Column;
import com.jobtracker.model.Priority;
import com.jobtracker.repository.ApplicationRepository;
import com.jobtracker.repository.ColumnRepository;

/**
 * Unit tests for {@link ApplicationService}: column-ownership checks on
 * create/move, the append-order computation, the PUT-never-moves-columns
 * guarantee on update, move's dual ownership checks, delete, and the
 * dynamic-query list method (mapping/pass-through only, per the brief — the
 * exact Criteria shape isn't asserted via reflection).
 */
@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    @Mock
    private ApplicationRepository applicationRepository;

    @Mock
    private ColumnRepository columnRepository;

    @Mock
    private MongoTemplate mongoTemplate;

    private ApplicationService applicationService;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(applicationRepository, columnRepository, mongoTemplate);
    }

    private ApplicationRequest sampleRequest(String columnId) {
        return new ApplicationRequest(
                columnId,
                "Acme Corp",
                "Backend Engineer",
                "https://acme.example/job/1",
                "Remote",
                "$120k-$140k",
                LocalDate.of(2026, 1, 15),
                LocalDate.of(2026, 2, 1),
                Priority.HIGH,
                "Referred by a friend"
        );
    }

    // --- createApplication ---

    @Test
    void createApplication_columnNotOwned_throwsResourceNotFoundException() {
        when(columnRepository.findByIdAndUserId("col-1", "user-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.createApplication("user-1", sampleRequest("col-1")))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(applicationRepository, never()).save(any(Application.class));
    }

    @Test
    void createApplication_appendsAtMaxExistingOrderInColumnPlusOne() {
        when(columnRepository.findByIdAndUserId("col-1", "user-1"))
                .thenReturn(Optional.of(Column.builder().id("col-1").userId("user-1").name("Applied").order(1).build()));
        when(applicationRepository.findFirstByUserIdAndColumnIdOrderByOrderDesc("user-1", "col-1"))
                .thenReturn(Optional.of(Application.builder().id("app-existing").order(2).build()));
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> {
            Application application = invocation.getArgument(0);
            application.setId("app-new");
            return application;
        });

        ApplicationResponse response = applicationService.createApplication("user-1", sampleRequest("col-1"));

        assertThat(response.order()).isEqualTo(3);
    }

    @Test
    void createApplication_firstCardInColumn_ordersAtZero() {
        when(columnRepository.findByIdAndUserId("col-1", "user-1"))
                .thenReturn(Optional.of(Column.builder().id("col-1").userId("user-1").name("Applied").order(1).build()));
        when(applicationRepository.findFirstByUserIdAndColumnIdOrderByOrderDesc("user-1", "col-1"))
                .thenReturn(Optional.empty());
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> {
            Application application = invocation.getArgument(0);
            application.setId("app-new");
            return application;
        });

        ApplicationResponse response = applicationService.createApplication("user-1", sampleRequest("col-1"));

        assertThat(response.order()).isEqualTo(0);
    }

    // --- updateApplication ---

    @Test
    void updateApplication_notOwned_throwsResourceNotFoundException() {
        when(applicationRepository.findByIdAndUserId("app-1", "user-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.updateApplication("user-1", "app-1", sampleRequest("col-1")))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(applicationRepository, never()).save(any(Application.class));
    }

    /**
     * Locks in the PUT-never-moves-columns guarantee (Task 4, re-verified
     * across Tasks 4/9/12): even though the request DTO carries a
     * columnId/implies an order, updateApplication must leave the existing
     * entity's columnId and order untouched — only moveApplication may
     * change those fields.
     */
    @Test
    void updateApplication_success_updatesFieldsButNeverColumnIdOrOrder() {
        Application existing = Application.builder()
                .id("app-1")
                .userId("user-1")
                .columnId("col-original")
                .company("Old Co")
                .role("Old Role")
                .order(9)
                .createdAt(Instant.parse("2026-01-01T00:00:00Z"))
                .updatedAt(Instant.parse("2026-01-01T00:00:00Z"))
                .build();
        when(applicationRepository.findByIdAndUserId("app-1", "user-1")).thenReturn(Optional.of(existing));
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // The request's columnId deliberately differs from the existing
        // entity's columnId — if this ever leaks through, it's a serious
        // regression, since PUT must not be able to move cards between columns.
        ApplicationRequest request = sampleRequest("col-different-from-existing");

        ApplicationResponse response = applicationService.updateApplication("user-1", "app-1", request);

        assertThat(response.company()).isEqualTo("Acme Corp");
        assertThat(response.role()).isEqualTo("Backend Engineer");
        assertThat(response.jobUrl()).isEqualTo("https://acme.example/job/1");
        assertThat(response.location()).isEqualTo("Remote");
        assertThat(response.salaryRange()).isEqualTo("$120k-$140k");
        assertThat(response.appliedDate()).isEqualTo(LocalDate.of(2026, 1, 15));
        assertThat(response.followUpDate()).isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(response.priority()).isEqualTo(Priority.HIGH);
        assertThat(response.notes()).isEqualTo("Referred by a friend");

        // columnId and order must be untouched from the pre-update entity.
        assertThat(response.columnId()).isEqualTo("col-original");
        assertThat(response.order()).isEqualTo(9);
    }

    // --- moveApplication ---

    @Test
    void moveApplication_applicationNotOwned_throwsResourceNotFoundException() {
        when(applicationRepository.findByIdAndUserId("app-1", "user-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                applicationService.moveApplication("user-1", "app-1", new MoveApplicationRequest("col-2", 0)))
                .isInstanceOf(ResourceNotFoundException.class);

        // Ownership check on the application fails first, so the target
        // column's ownership is never even checked.
        verify(columnRepository, never()).findByIdAndUserId(any(), any());
        verify(applicationRepository, never()).save(any(Application.class));
    }

    @Test
    void moveApplication_targetColumnNotOwned_throwsResourceNotFoundException() {
        Application existing = Application.builder().id("app-1").userId("user-1").columnId("col-1").order(0).build();
        when(applicationRepository.findByIdAndUserId("app-1", "user-1")).thenReturn(Optional.of(existing));
        when(columnRepository.findByIdAndUserId("col-2", "user-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                applicationService.moveApplication("user-1", "app-1", new MoveApplicationRequest("col-2", 0)))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(applicationRepository, never()).save(any(Application.class));
    }

    @Test
    void moveApplication_success_setsColumnIdAndOrderVerbatimWithNoOtherSaves() {
        Application existing = Application.builder()
                .id("app-1")
                .userId("user-1")
                .columnId("col-1")
                .order(0)
                .build();
        when(applicationRepository.findByIdAndUserId("app-1", "user-1")).thenReturn(Optional.of(existing));
        when(columnRepository.findByIdAndUserId("col-2", "user-1"))
                .thenReturn(Optional.of(Column.builder().id("col-2").userId("user-1").name("Interview").order(2).build()));
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> invocation.getArgument(0));

        applicationService.moveApplication("user-1", "app-1", new MoveApplicationRequest("col-2", 5));

        ArgumentCaptor<Application> captor = ArgumentCaptor.forClass(Application.class);
        verify(applicationRepository, times(1)).save(captor.capture());
        assertThat(captor.getValue().getColumnId()).isEqualTo("col-2");
        assertThat(captor.getValue().getOrder()).isEqualTo(5);

        // No sibling renumbering: exactly one application lookup, one
        // column ownership check, and one save — nothing else touched.
        verify(applicationRepository, times(1)).findByIdAndUserId("app-1", "user-1");
        verify(columnRepository, times(1)).findByIdAndUserId("col-2", "user-1");
        verifyNoMoreInteractions(applicationRepository, columnRepository);
    }

    // --- deleteApplication ---

    @Test
    void deleteApplication_notOwned_throwsResourceNotFoundException() {
        when(applicationRepository.findByIdAndUserId("app-1", "user-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.deleteApplication("user-1", "app-1"))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(applicationRepository, never()).delete(any(Application.class));
    }

    @Test
    void deleteApplication_success_callsRepositoryDelete() {
        Application existing = Application.builder().id("app-1").userId("user-1").build();
        when(applicationRepository.findByIdAndUserId("app-1", "user-1")).thenReturn(Optional.of(existing));

        applicationService.deleteApplication("user-1", "app-1");

        verify(applicationRepository).delete(existing);
    }

    // --- listApplications ---

    @Test
    void listApplications_mapsMongoTemplateResultsToApplicationResponses() {
        Application app1 = Application.builder()
                .id("app-1").userId("user-1").columnId("col-1")
                .company("Acme").role("Engineer").order(0)
                .priority(Priority.MEDIUM)
                .build();
        Application app2 = Application.builder()
                .id("app-2").userId("user-1").columnId("col-1")
                .company("Beta Inc").role("Designer").order(1)
                .priority(Priority.LOW)
                .build();
        when(mongoTemplate.find(any(Query.class), eq(Application.class))).thenReturn(List.of(app1, app2));

        List<ApplicationResponse> responses =
                applicationService.listApplications("user-1", null, null, null, null);

        assertThat(responses).hasSize(2);
        assertThat(responses).extracting(ApplicationResponse::id).containsExactly("app-1", "app-2");
        assertThat(responses).extracting(ApplicationResponse::company).containsExactly("Acme", "Beta Inc");
    }

    @Test
    void listApplications_companyFilter_isAppliedToCriteriaQueryObject() {
        when(mongoTemplate.find(any(Query.class), eq(Application.class))).thenReturn(List.of());

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);

        applicationService.listApplications("user-1", "Acme", null, null, null);

        verify(mongoTemplate).find(queryCaptor.capture(), eq(Application.class));
        org.bson.Document queryObject = queryCaptor.getValue().getQueryObject();
        assertThat(queryObject.get("userId")).isEqualTo("user-1");
        assertThat(queryObject.containsKey("company")).isTrue();
    }

    @Test
    void listApplications_noResults_returnsEmptyListWithoutThrowing() {
        when(mongoTemplate.find(any(Query.class), eq(Application.class))).thenReturn(List.of());

        List<ApplicationResponse> responses =
                applicationService.listApplications("user-1", null, Priority.HIGH, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));

        assertThat(responses).isEmpty();
    }
}
