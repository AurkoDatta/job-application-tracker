import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

// Pre-validated categorical palette (task-11-brief.md) — six hues run
// through this project's colorblind-safety validator against candidate
// palettes tuned to the app's indigo/postal-manifest identity. Fixed
// order, never cycled/re-derived: slot N is always the Nth color, assigned
// below by each column's position in ascending `order`.
//
// The validator passed with two WARNs whose mitigation is NOT optional:
// (1) worst adjacent CVD separation sits in the 6-8 floor band, legal only
// with a secondary (non-color) encoding, and (2) slot 2 (#e08a2e) is below
// 3:1 contrast against the page background. Both are mitigated the same
// way: every slice gets a real text legend entry (see <Legend/> below),
// never color alone as the only way to identify a slice.
const CATEGORICAL_PALETTE = ['#2d5fd6', '#e08a2e', '#159c78', '#c94f3f', '#7d5fc7', '#4f8f4a']

// Catch-all color for the folded "Other" slice (7th+ column). Deliberately
// the app's existing muted `slate` UI token, not a 7th hue pulled from
// nowhere and never run through the validator — "Other" isn't a distinct
// series identity competing with the six validated ones, it's explicitly a
// grab-bag, so a neutral tone communicates that honestly.
const OTHER_COLOR = '#8A94A6'

const MAX_SLICES = CATEGORICAL_PALETTE.length

/**
 * Builds the pie's slice data from the raw `statusDistribution` array,
 * assigning palette colors by position and folding anything past the 6th
 * slot into a single "Other" bucket.
 *
 * WHY assignment is by array position, not a re-sort: `GET /api/stats`
 * (see `StatsResponse`/`ColumnCount`'s Javadoc and the backend's
 * `findByUserIdOrderByOrderAsc`-driven loop) already emits `perColumn`/
 * `statusDistribution` in ascending column `order` — `ColumnCount` doesn't
 * even carry the numeric `order` field, because the ordering is a
 * contract of the array itself, not a value to re-derive. Re-sorting here
 * would be redundant at best and silently wrong if the frontend ever
 * guessed at a different sort key.
 *
 * WHY fold beyond slot 6 into "Other" rather than generating a 7th hue: the
 * categorical palette above was only validated for six colorblind-safe
 * slices (task-11-brief.md) — inventing a 7th color on the fly would ship
 * an unvalidated hue with no accessibility guarantee.
 *
 * @param {Array<{columnId: string, columnName: string, count: number}>} statusDistribution
 * @returns {Array<{columnId: string, columnName: string, count: number, color: string}>}
 */
function buildSliceData(statusDistribution) {
  const primary = statusDistribution.slice(0, MAX_SLICES).map((entry, index) => ({
    ...entry,
    color: CATEGORICAL_PALETTE[index],
  }))

  const overflow = statusDistribution.slice(MAX_SLICES)
  if (overflow.length > 0) {
    primary.push({
      columnId: 'other',
      columnName: 'Other',
      count: overflow.reduce((sum, entry) => sum + entry.count, 0),
      color: OTHER_COLOR,
    })
  }

  return primary
}

/**
 * Recharts pie chart of applications per column (`statusDistribution`,
 * same shape as `perColumn`). One slice per column, colored from the
 * pre-validated categorical palette assigned by ascending column `order`,
 * folding any column past the 6th into a single "Other" slice — see
 * `buildSliceData` above for the full reasoning on both.
 *
 * A `<Legend/>` with real column names (not just color swatches) is
 * required, not optional polish — see the palette comment above for the
 * two validator WARNs it mitigates.
 *
 * @param {object} props
 * @param {Array<{columnId: string, columnName: string, count: number}>} props.statusDistribution
 *   the `statusDistribution` array from `GET /api/stats`
 */
function StatusDistributionChart({ statusDistribution }) {
  const slices = buildSliceData(statusDistribution)
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)

  return (
    <div className="rounded border border-slate/20 bg-card p-4">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-ink">
        Status distribution
      </h2>

      {total === 0 ? (
        <p className="mt-3 font-sans text-sm text-slate">
          No applications yet — this chart fills in once you add some.
        </p>
      ) : (
        <div className="mt-3 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="count"
                nameKey="columnName"
                cx="50%"
                cy="45%"
                outerRadius={80}
                label={false}
              >
                {slices.map((slice) => (
                  <Cell key={slice.columnId} fill={slice.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 13, borderRadius: 4 }}
                labelStyle={{ color: '#1B2027', fontWeight: 600 }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#1B2027' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default StatusDistributionChart
