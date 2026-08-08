import { DragDropContext } from '@hello-pangea/dnd'
import { useColumns } from '../../hooks/useColumns'
import { useApplications } from '../../hooks/useApplications'
import KanbanColumn from './KanbanColumn'
import AddColumnForm from './AddColumnForm'

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
    clearError: clearApplicationsError,
  } = useApplications()

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
    // Task 9 wires this to open `ApplicationModal`; nothing to open yet.
    console.log('card clicked (Task 9 will open the edit modal):', application)
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
            />
          ))}
          <AddColumnForm onCreate={createColumn} />
        </div>
      </DragDropContext>
    </div>
  )
}

export default KanbanBoard
