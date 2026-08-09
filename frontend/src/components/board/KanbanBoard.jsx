import { useState } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { useColumns } from '../../hooks/useColumns'
import { useApplications } from '../../hooks/useApplications'
import { hasActiveFilters } from '../../utils/filters'
import KanbanColumn from './KanbanColumn'
import AddColumnForm from './AddColumnForm'
import ApplicationModal from '../modal/ApplicationModal'
import Spinner from '../common/Spinner'
import ErrorBanner from '../common/ErrorBanner'

/**
 * The Kanban board: owns `useColumns`/`useApplications` (both hooks'
 * mount-time fetches and their loading/error states), the
 * `DragDropContext`, and its `onDragEnd` handler. `Board.jsx` is a thin
 * page shell around this component rather than calling the hooks itself —
 * a single owner for both hooks avoids two separate mount-time GET
 * requests for the same data.
 *
 * Both hooks' `error` fields are surfaced the same simple way: a single
 * dismissible inline banner above the board (not a full-page error state)
 * — this deliberately also covers a failed drag-and-drop move (see
 * `useApplications.moveApplication`'s rollback), which must leave the
 * board itself visible and reverted, not hidden behind a blocking error
 * screen.
 *
 * Also owns the single `ApplicationModal` instance for the whole board
 * (Task 9): one modal, driven by `modalState`, reused for both "click a
 * card to edit it" and "click a column's + Add application to create one"
 * — `useApplications`' create/update/delete functions are threaded straight
 * down as props rather than wrapped, since they already update local
 * `applications` state on success (see `useApplications.js`'s wait-then-
 * update pattern for why that's safe to do directly, unlike the drag-and-
 * drop path above).
 *
 * @param {object} props
 * @param {{company?: string, priority?: string, startDate?: string, endDate?: string}} [props.filters]
 *   current filter values (Task 12), owned by `Board.jsx` and passed straight
 *   through to `useApplications`. Also used here to derive `dragDisabled`
 *   (see below) — this component is the one place that both needs the raw
 *   filters AND drives the drag-and-drop tree, so it's the natural spot for
 *   that derivation rather than duplicating it in `Board.jsx`.
 */
function KanbanBoard({ filters }) {
  const {
    columns,
    loading: columnsLoading,
    error: columnsError,
    createColumn,
    renameColumn,
    deleteColumn,
    clearError: clearColumnsError,
  } = useColumns()
  const {
    applications,
    loading: applicationsLoading,
    error: applicationsError,
    moveApplication,
    createApplication,
    updateApplication,
    deleteApplication,
    clearError: clearApplicationsError,
  } = useApplications(filters)

  // Drag-and-drop reordering (dndReorder.js) renumbers ALL applications in
  // an affected column sequentially (0..n-1) based on whatever's currently
  // in `applications`. When a filter is active, that array is only a
  // PARTIAL view of a column's real contents, so that renumbering would
  // silently collide with the true stored `order` of applications hidden by
  // the filter — a real data-corruption risk, not a cosmetic one. Disabling
  // drag whenever any filter field is actually set is the simplest correct
  // guard against that (see `utils/filters.js` for the shared "is anything
  // actually set" check — `Board.jsx` uses the same function to decide
  // whether to show the "clear filters to reorder" note).
  const dragDisabled = hasActiveFilters(filters)

  // Single source of truth for the board's one ApplicationModal instance:
  // which mode it's in, and which application/column it's targeting.
  // `application`/`columnId` are mutually relevant only to their own mode
  // (edit reads `application`, create reads `columnId`) but kept in one
  // object so opening the modal is always a single atomic state update —
  // no risk of a stale `application` from a previous edit leaking into a
  // newly-opened create, or vice versa.
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'create',
    application: null,
    columnId: null,
  })

  const loading = columnsLoading || applicationsLoading
  const error = columnsError || applicationsError

  function dismissError() {
    clearColumnsError()
    clearApplicationsError()
  }

  function handleDragEnd(result) {
    // Belt-and-suspenders alongside `isDragDisabled` on every `Draggable`
    // below (which already prevents the drag gesture itself, so
    // `onDragEnd` should never even fire with a real `destination` while
    // filtered): if it somehow did, bailing out here before
    // `moveApplication` runs means the corrupting renumber-against-a-
    // partial-view math (see `dragDisabled`'s comment above) never
    // executes, no matter how the drag was triggered.
    if (dragDisabled) return
    moveApplication(result)
  }

  function applicationsForColumn(columnId) {
    return applications.filter((app) => app.columnId === columnId).sort((a, b) => a.order - b.order)
  }

  function handleCardClick(application) {
    setModalState({ isOpen: true, mode: 'edit', application, columnId: null })
  }

  function handleAddApplication(columnId) {
    setModalState({ isOpen: true, mode: 'create', application: null, columnId })
  }

  function closeModal() {
    setModalState((prev) => ({ ...prev, isOpen: false }))
  }

  if (loading) {
    return <Spinner label="Loading board…" />
  }

  return (
    <div>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} onDismiss={dismissError} />
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              applications={applicationsForColumn(column.id)}
              onRename={renameColumn}
              onDelete={deleteColumn}
              onCardClick={handleCardClick}
              onAddApplication={handleAddApplication}
              dragDisabled={dragDisabled}
            />
          ))}
          <AddColumnForm onCreate={createColumn} />
        </div>
      </DragDropContext>

      <ApplicationModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        application={modalState.application}
        columnId={modalState.columnId}
        onClose={closeModal}
        onCreate={createApplication}
        onUpdate={updateApplication}
        onDelete={deleteApplication}
      />
    </div>
  )
}

export default KanbanBoard
