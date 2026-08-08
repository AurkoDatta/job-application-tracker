import KanbanBoard from '../components/board/KanbanBoard.jsx'
import UpcomingFollowUps from '../components/dashboard/UpcomingFollowUps.jsx'

/**
 * Board page: thin shell around `KanbanBoard`, plus the `UpcomingFollowUps`
 * dashboard widget (Task 10) rendered as a slim strip above it.
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
 * without weighing that tradeoff first.
 */
function Board() {
  return (
    <main className="min-h-screen px-6 py-6">
      <div className="mb-4">
        <UpcomingFollowUps />
      </div>
      <KanbanBoard />
    </main>
  )
}

export default Board
