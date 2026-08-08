/**
 * Small KPI tile: a label and a single value, e.g. "Total Applications" /
 * "13" or "Interview → Offer" / "50%". Reusable across the stats page
 * (Task 11) for `totalApplications`, `rejectedCount`, and the two funnel
 * conversion rates — deliberately generic (just label/value/accent) rather
 * than baking in any stats-specific formatting, so callers pass an
 * already-formatted `value` string (e.g. the percentage string, not the
 * raw `0.4` rate).
 *
 * @param {object} props
 * @param {string} props.label the tile's caption, e.g. "Total Applications"
 * @param {string|number} props.value the already-formatted value to display
 * @param {'stamp'|'rust'} [props.accent] which design-system token colors
 *   the value text; defaults to `stamp` (the app's primary accent). The
 *   brief calls for `rust` specifically on the rejected-count tile, since
 *   that's semantically a "stopped" outcome — every other tile uses the
 *   default.
 */
function StatCard({ label, value, accent = 'stamp' }) {
  const valueColorClass = accent === 'rust' ? 'text-rust' : 'text-stamp'

  return (
    <div className="rounded border border-slate/20 bg-card p-3">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-slate">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${valueColorClass}`}>{value}</p>
    </div>
  )
}

export default StatCard
