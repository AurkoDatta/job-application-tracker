import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Recharts bar chart of applications submitted per ISO week
 * (`perPeriod`, e.g. `[{periodLabel: "2026-W27", count: 3}, ...]`).
 * Single-series data — a single flat `stamp`-colored bar, no palette or
 * legend needed (see task-11-brief.md: "a single series never needs a
 * categorical palette").
 *
 * **Gap-filling decision (task-11-brief.md's "recommended, not
 * mandatory" note): deliberately NOT implemented.** The backend's
 * `perPeriod` omits weeks with zero applications entirely, so two weeks
 * with a real 5-week gap between them render as visually adjacent bars on
 * a category axis. Correctly filling that gap requires parsing an ISO
 * `"YYYY-Www"` label back into a concrete calendar date, walking forward
 * week-by-week, and re-deriving each label — the risky part being
 * hand-rolled ISO week-number/year arithmetic, which has real edge cases
 * at year boundaries (a week can belong to a different ISO year than its
 * Jan 1/Dec 31 calendar year). Getting that subtly wrong would be worse
 * than not gap-filling at all, and the brief explicitly permits skipping
 * it with a documented reason rather than shipping incorrect date math.
 * `perPeriod` is rendered as-is (sparse, chronologically ascending per the
 * backend's contract).
 *
 * @param {object} props
 * @param {Array<{periodLabel: string, count: number}>} props.perPeriod the
 *   `perPeriod` array from `GET /api/stats`
 */
function ApplicationsOverTimeChart({ perPeriod }) {
  return (
    <div className="rounded border border-slate/20 bg-card p-4">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-ink">
        Applications per week
      </h2>

      {perPeriod.length === 0 ? (
        <p className="mt-3 font-sans text-sm text-slate">
          No applications with an applied date yet — this chart fills in once you log some.
        </p>
      ) : (
        <div className="mt-3 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perPeriod} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="periodLabel"
                tick={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fill: '#1B2027' }}
                axisLine={{ stroke: '#8A94A6' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, fill: '#8A94A6' }}
                axisLine={{ stroke: '#8A94A6' }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 13, borderRadius: 4 }}
                labelStyle={{ color: '#1B2027', fontWeight: 600 }}
                cursor={{ fill: 'rgba(39, 70, 144, 0.06)' }}
              />
              <Bar dataKey="count" fill="#274690" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default ApplicationsOverTimeChart
