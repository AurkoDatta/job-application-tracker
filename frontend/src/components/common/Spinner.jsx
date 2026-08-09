/**
 * Small, reusable loading indicator: a spinning ring (plain CSS animation —
 * no external dependency, this is a utility app rather than a marketing
 * page that would warrant something more elaborate) plus an adjacent label.
 *
 * Extracted from the several near-identical ad-hoc `"Loading…"` `<p>` tags
 * that used to be duplicated across `KanbanBoard`, `Stats`, and
 * `UpcomingFollowUps` (each with its own copy of the same font-mono/
 * uppercase/tracking-widest/`slate` styling) — this is the single shared
 * shape for "a fetch is in flight," with only the label text varying by
 * caller.
 *
 * @param {object} props
 * @param {string} [props.label] text shown next to the spinning ring,
 *   default `'Loading…'`
 */
function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-slate">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-slate/30 border-t-slate"
      />
      <span>{label}</span>
    </div>
  )
}

export default Spinner
