import { useState } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import ApplicationCard from './ApplicationCard'

/**
 * One Kanban column: header with click-to-rename and a delete button, plus
 * its applications rendered as draggable cards inside a `Droppable`.
 *
 * @param {object} props
 * @param {object} props.column the column ({id, name, order})
 * @param {Array<object>} props.applications this column's applications,
 *   already sorted by `order` ascending
 * @param {Function} props.onRename (id, name) => void — commits a rename
 * @param {Function} props.onDelete (id) => void — deletes the column
 * @param {Function} [props.onCardClick] forwarded to each `ApplicationCard`
 */
function KanbanColumn({ column, applications, onRename, onDelete, onCardClick }) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(column.name)

  function startEditing() {
    setDraftName(column.name)
    setEditing(true)
  }

  function commitRename() {
    setEditing(false)
    const trimmed = draftName.trim()
    // Only fire a network call for an actual change — re-committing the
    // same name on every blur (e.g. clicking in and immediately clicking
    // out) would be a wasted PUT.
    if (trimmed && trimmed !== column.name) {
      onRename(column.id, trimmed)
    }
  }

  function handleDelete() {
    // A polished ConfirmDialog is Task 9's job for the more consequential
    // application-delete flow; deleting a whole column (and implicitly
    // orphaning/removing everything shown in it) still warrants at least a
    // native confirm here, per task-8-brief.
    if (window.confirm(`Delete column "${column.name}"? This cannot be undone.`)) {
      onDelete(column.id)
    }
  }

  return (
    <div className="flex w-72 shrink-0 flex-col rounded border border-slate/20 bg-paper">
      <div className="flex items-center justify-between gap-2 border-b border-slate/20 px-3 py-2">
        {editing ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              // Enter commits (via blur, which reuses the same commit
              // path); Escape cancels without saving.
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-full border-b border-stamp bg-transparent font-mono text-xs font-semibold uppercase tracking-widest text-ink focus:outline-none"
          />
        ) : (
          <h2
            onClick={startEditing}
            className="cursor-text font-mono text-xs font-semibold uppercase tracking-widest text-ink"
            title="Click to rename"
          >
            {column.name}
          </h2>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[10px] text-slate">{applications.length}</span>
          <button
            type="button"
            onClick={handleDelete}
            className="font-mono text-[10px] uppercase tracking-wide text-rust hover:text-rust/80"
            aria-label={`Delete column ${column.name}`}
          >
            Delete
          </button>
        </div>
      </div>

      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`min-h-[80px] flex-1 p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-stamp/5' : ''}`}
          >
            {applications.map((application, index) => (
              <ApplicationCard
                key={application.id}
                application={application}
                index={index}
                onCardClick={onCardClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

export default KanbanColumn
