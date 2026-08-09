import { useStats } from '../hooks/useStats'
import StatCard from '../components/stats/StatCard'
import ConversionFunnelChart from '../components/stats/ConversionFunnelChart'
import ApplicationsOverTimeChart from '../components/stats/ApplicationsOverTimeChart'
import StatusDistributionChart from '../components/stats/StatusDistributionChart'
import Spinner from '../components/common/Spinner'
import ErrorBanner from '../components/common/ErrorBanner'

/**
 * Analytics page (Task 11): fetches `GET /api/stats` via `useStats` and
 * composes the whole page from it — a top `StatCard` row (total
 * applications, rejected count), the conversion funnel chart (which itself
 * renders the two conversion-rate `StatCard`s alongside its bars), the
 * applications-per-week bar chart, and the status distribution pie chart.
 *
 * Loading/error states match the convention `KanbanBoard.jsx` established
 * (Task 8): a plain "Loading…" line while the fetch is in flight, and a
 * dismissible inline banner on error — no separate full-page error screen.
 * A user with zero applications is a normal, valid state (per
 * `StatsResponse`'s own Javadoc), not an error: every count comes back 0
 * and each chart component below renders its own sensible empty state
 * rather than a broken/NaN chart.
 *
 * **Why `rejectedCount` is a `StatCard`, not part of `ConversionFunnelChart`'s
 * bars:** the funnel is a snapshot of the four *forward* stages (Wishlist
 * -> Applied -> Interview -> Offer) that legitimately reads as a sequence,
 * left-to-right, of "further along" outcomes. Rejection isn't a fifth,
 * further stage past Offer — an application can be rejected straight out
 * of Wishlist, after Applied, after Interview, or even after an Offer — so
 * drawing it as the rightmost bar in that same sequence would visually
 * misrepresent it as "beyond Offer." Showing it as its own separate tile
 * (using the `rust` accent, since it's semantically a "stopped" outcome)
 * keeps that distinction honest.
 */
function Stats() {
  const { stats, loading, error } = useStats()

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-6">
        <Spinner label="Loading stats…" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen px-6 py-6">
        <ErrorBanner message={error} />
      </main>
    )
  }

  const { totalApplications, conversionFunnel, perPeriod, statusDistribution } = stats

  return (
    <main className="min-h-screen px-6 py-6">
      <h1 className="mb-4 font-mono text-2xl font-semibold uppercase tracking-widest text-stamp">
        Stats
      </h1>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Applications" value={totalApplications} />
        <StatCard label="Rejected" value={conversionFunnel.rejectedCount} accent="rust" />
      </div>

      <div className="mb-4">
        <ConversionFunnelChart funnel={conversionFunnel} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ApplicationsOverTimeChart perPeriod={perPeriod} />
        <StatusDistributionChart statusDistribution={statusDistribution} />
      </div>
    </main>
  )
}

export default Stats
