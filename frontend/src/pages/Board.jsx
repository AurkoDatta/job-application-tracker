import { useState } from 'react'
import KanbanBoard from '../components/board/KanbanBoard.jsx'
import UpcomingFollowUps from '../components/dashboard/UpcomingFollowUps.jsx'
import FilterBar from '../components/filters/FilterBar.jsx'

/**
 * Board page: thin shell around `KanbanBoard`, plus the `UpcomingFollowUps`
 * dashboard widget (Task 10) rendered as a slim strip above it, and (Task
 * 12) the `FilterBar` above the board itself.
 * Loading/error states for columns and applications live inside
 * `KanbanBoard` itself (it owns `useColumns`/`useApplications`) rather than
 * being duplicated here — see `KanbanBoard.jsx`'s top-level comment for why.
 *
 * `UpcomingFollowUps` calls `useApplications()` independently of
 * `KanbanBoard`'s own internal call to the same hook, so `GET
 * /api/applications` fires twice on page load. This is a deliberate,
 * accepted inefficiency (not a bug): lifting `useApplications` up to this
 * page level and prop-drilling it into `KanbanBoard` would mean touching
 * Task 8/9's already-reviewed component internals for the sake of a small,
 * secondary widget. Please don't "fix" this into a prop-drilling refactor
 * without weighing that tradeoff first. Per the same reasoning, `filters`
 * state (new in Task 12) is owned HERE and passed only to `KanbanBoard` —
 * `UpcomingFollowUps` deliberately keeps its own separate, unfiltered call
 * and is untouched by this task, since it's a "what's coming up regardless
 * of the board view" widget, not a filtered board view itself.
 */
function Board() {
  // Single owner of the actual filter values — `FilterBar` is a controlled
  // component that only reports changes upward via `onChange`, and
  // `KanbanBoard` only ever receives this object to read, never to own.
  const [filters, setFilters] = useState({})

  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mb-4">
        <UpcomingFollowUps />
      </div>
      <FilterBar filters={filters} onChange={setFilters} />
      <KanbanBoard filters={filters} />
    </main>
  )
}

export default Board
