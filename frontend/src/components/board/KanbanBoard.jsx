import { useState } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import { useColumns } from '../../hooks/useColumns'
import { useApplications } from '../../hooks/useApplications'
import KanbanColumn from './KanbanColumn'
import AddColumnForm from './AddColumnForm'
import ApplicationModal from '../modal/ApplicationModal'

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
 */
function KanbanBoard() {
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
  } = useApplications()

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
    return <p className="font-mono text-sm uppercase tracking-widest text-slate">Loading board…</p>
  }

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded border border-rust/40 bg-rust/10 px-4 py-2 text-sm text-rust">
          <span>{error}</span>
          <button
            type="button"
            onClick={dismissError}
            aria-label="Dismiss error"
            className="font-mono text-xs uppercase tracking-wide text-rust hover:text-rust/80"
          >
            Dismiss
          </button>
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
