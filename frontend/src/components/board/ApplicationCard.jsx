import { Draggable } from '@hello-pangea/dnd'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../utils/priority'

// Full literal class strings per priority color, rather than building a
// class name like `border-${color}/40` at render time — Tailwind's JIT
// scans source files for literal class-name substrings, so a dynamically
// interpolated class would never be generated into the compiled CSS. This
// map is what makes the dynamic-per-priority styling actually work.
const PRIORITY_BADGE_CLASSES = {
  slate: 'border-slate/40 text-slate',
  amber: 'border-amber/40 text-amber',
  rust: 'border-rust/40 text-rust',
}

/**
 * One draggable Kanban card showing a read-only summary of an application.
 *
 * @param {object} props
 * @param {object} props.application the application to render (id, company,
 *   role, priority, location, ...)
 * @param {number} props.index the card's index within its column, required
 *   by `@hello-pangea/dnd`'s `Draggable` to compute drag offsets
 * @param {Function} [props.onCardClick] called with the application on click;
 *   `KanbanBoard` wires this to open `ApplicationModal` in edit mode (Task 9)
 * @param {boolean} [props.dragDisabled] passed straight to `Draggable`'s own
 *   `isDragDisabled` (Task 12) — true while any board filter is active, so
 *   the drag gesture itself never starts (rather than starting and being
 *   corrected after the fact), preventing both the visual reorder and the
 *   `PATCH /move` call that would otherwise follow it.
 */
function ApplicationCard({ application, index, onCardClick, dragDisabled }) {
  const priorityColor = PRIORITY_COLORS[application.priority]
  // Signature "tracking code" chip per Task 6's design note: a stable,
  // deterministic label derived from the application's own id (rather than
  // a separately generated one) so it stays consistent across reloads
  // without needing any backend support.
  const trackingCode = `APP-${application.id.slice(-6).toUpperCase()}`

  return (
    <Draggable draggableId={application.id} index={index} isDragDisabled={dragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onCardClick?.(application)}
          className={`mb-3 cursor-pointer rounded border border-slate/20 bg-card p-3 shadow-sm transition-shadow ${
            snapshot.isDragging ? 'shadow-md ring-1 ring-stamp/40' : ''
          }`}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate">{trackingCode}</span>
            <span
              className={`rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${PRIORITY_BADGE_CLASSES[priorityColor]}`}
            >
              {PRIORITY_LABELS[application.priority]}
            </span>
          </div>
          <p className="font-sans text-sm font-semibold text-ink">{application.company}</p>
          <p className="font-sans text-sm text-ink/80">{application.role}</p>
          {application.location && <p className="mt-1 font-sans text-xs text-slate">{application.location}</p>}
        </div>
      )}
    </Draggable>
  )
}

export default ApplicationCard
