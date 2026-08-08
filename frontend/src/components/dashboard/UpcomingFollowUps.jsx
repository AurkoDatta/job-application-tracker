import { useApplications } from '../../hooks/useApplications'
import { daysUntil, formatRelativeLabel } from '../../utils/dateFormat'

/**
 * Small, self-contained dashboard widget listing applications whose
 * `followUpDate` falls within the next 7 days (today through 7 days from
 * today, inclusive of both ends). Read-only — clicking a row does nothing;
 * wiring rows up to `ApplicationModal` would mean lifting that modal's
 * state out of `KanbanBoard` (which owns it per Task 9), which is out of
 * scope for this small additive widget.
 *
 * Deliberately calls `useApplications()` a second, independent time rather
 * than receiving `applications` as a prop from `KanbanBoard` (which already
 * calls the hook internally) — see the comment in `Board.jsx` where this
 * component is rendered for why that duplication is an accepted tradeoff
 * here rather than a refactor of Task 8/9's already-reviewed
 * `KanbanBoard`.
 *
 * Deliberately does NOT surface overdue (past-due) follow-ups — the spec
 * for this widget is "next 7 days," not general follow-up tracking, so a
 * `followUpDate` in the past is simply filtered out, not highlighted.
 */
function UpcomingFollowUps() {
  const { applications, loading } = useApplications()

  if (loading) {
    return <p className="font-mono text-xs uppercase tracking-widest text-slate">Loading follow-ups…</p>
  }

  // Inclusive 0-7 day window (today through 7 days out), non-null
  // followUpDate only, soonest first.
  const upcoming = applications
    .filter((app) => app.followUpDate)
    .filter((app) => {
      const days = daysUntil(app.followUpDate)
      return days >= 0 && days <= 7
    })
    .sort((a, b) => (a.followUpDate < b.followUpDate ? -1 : a.followUpDate > b.followUpDate ? 1 : 0))

  return (
    <div className="rounded border border-slate/20 bg-card p-3">
      <h2 className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-ink">
        Upcoming follow-ups
      </h2>

      {upcoming.length === 0 ? (
        <p className="font-sans text-sm text-slate">No follow-ups due in the next 7 days.</p>
      ) : (
        <ul>
          {upcoming.map((app) => (
            <li
              key={app.id}
              className="flex items-center justify-between gap-3 border-b border-slate/10 py-1.5 last:border-b-0"
            >
              <span className="min-w-0 font-sans text-sm text-ink">
                <span className="font-semibold">{app.company}</span>
                <span className="text-ink/70"> — {app.role}</span>
              </span>
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-slate">
                {formatRelativeLabel(app.followUpDate)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default UpcomingFollowUps
