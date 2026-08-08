import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import StatCard from './StatCard'

// Single-hue ordinal ramp, light -> dark, validated by this project's
// dataviz color tooling specifically for a fixed, ordered sequence like a
// funnel's stages (see task-11-brief.md) — NOT the categorical palette
// used by StatusDistributionChart. Each stage gets a fixed, hard-coded
// color by position (never derived from column `order`, unlike the pie
// chart): funnel stages are always exactly these four, in this order,
// regardless of how the user has renamed/reordered their actual columns.
const FUNNEL_STAGE_COLORS = ['#8ba2e6', '#5e7fd8', '#3f5cc4', '#223f9e']

/**
 * Formats a 0-1 rate as a whole-number percentage string, e.g. `0.4` ->
 * `"40%"`. Local to this component since the two funnel rates are the
 * only place on the stats page a raw rate needs this treatment.
 *
 * @param {number} rate a rate in the 0-1 range
 * @returns {string} e.g. `"40%"`
 */
function formatRate(rate) {
  return `${Math.round(rate * 100)}%`
}

/**
 * Recharts bar chart of the four ordered funnel stages (Wishlist -> Applied
 * -> Interview -> Offer), plus the two conversion-rate `StatCard`s
 * alongside it.
 *
 * `rejectedCount` from `FunnelStats` is deliberately NOT rendered here as a
 * 5th bar — see `Stats.jsx`'s top-level comment for the full reasoning.
 * In short: an application can be rejected at any stage of the funnel
 * (straight out of Wishlist, after Applied, after Interview, even after an
 * Offer), so drawing it as a bar past "Offer" in this sequence would
 * visually claim it's "further along" than an offer, which is wrong. It's
 * shown by `Stats.jsx` as its own separate `StatCard` instead.
 *
 * @param {object} props
 * @param {import('../../hooks/useStats').FunnelStats} props.funnel the
 *   `conversionFunnel` object from `GET /api/stats`
 *   (`{wishlistCount, appliedCount, interviewCount, offerCount,
 *   rejectedCount, appliedToInterviewRate, interviewToOfferRate}`)
 */
function ConversionFunnelChart({ funnel }) {
  const data = [
    { stage: 'Wishlist', count: funnel.wishlistCount },
    { stage: 'Applied', count: funnel.appliedCount },
    { stage: 'Interview', count: funnel.interviewCount },
    { stage: 'Offer', count: funnel.offerCount },
  ]

  return (
    <div className="rounded border border-slate/20 bg-card p-4">
      <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-ink">
        Conversion funnel
      </h2>

      <div className="mt-3 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="stage"
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
            <Bar dataKey="count" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.stage} fill={FUNNEL_STAGE_COLORS[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatCard label="Applied → Interview" value={formatRate(funnel.appliedToInterviewRate)} />
        <StatCard label="Interview → Offer" value={formatRate(funnel.interviewToOfferRate)} />
      </div>
    </div>
  )
}

export default ConversionFunnelChart
