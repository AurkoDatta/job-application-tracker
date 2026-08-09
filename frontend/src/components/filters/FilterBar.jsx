import { useEffect, useState } from 'react'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { PRIORITY_LABELS } from '../../utils/priority'
import { hasActiveFilters } from '../../utils/filters'

// A few hundred ms is enough to absorb a normal typing cadence (letters of
// a company name arriving every ~50-150ms) without feeling laggy once the
// user actually pauses.
const COMPANY_DEBOUNCE_MS = 350

/**
 * Filter bar for the board: company text search (debounced), priority
 * select, and a start/end date range — plus a "Clear filters" control.
 * Fully controlled: `Board.jsx` owns the actual `filters` state and is the
 * only thing that ever calls the backend with it; this component just
 * renders the current values and reports changes upward via `onChange`.
 *
 * Company search is debounced (via `useDebouncedValue`) before it's
 * reported upward, because it's the one field typed character-by-character
 * — reporting every keystroke would fire a `GET /api/applications` request
 * per character. Priority and the date inputs are reported immediately:
 * a `<select>` change and a date-picker pick are already single, deliberate
 * "I chose a value" events (not a stream of intermediate states), so
 * there's nothing to debounce away.
 *
 * @param {object} props
 * @param {{company?: string, priority?: string, startDate?: string, endDate?: string}} props.filters
 *   the current, already-committed filter values (as last reported via
 *   `onChange`) — used to keep this component in sync when `Board.jsx`
 *   resets filters externally (e.g. its own "Clear filters" handling), and
 *   to know whether to show the drag-disabled note.
 * @param {Function} props.onChange (nextFilters) => void — called with a
 *   full replacement filters object whenever a (debounced, for company)
 *   value actually changes.
 */
function FilterBar({ filters, onChange }) {
  // Company is the one field with its own local, immediate-feedback state
  // (so the input feels responsive while typing) separate from the
  // debounced value that actually flows into `filters` — see the
  // `useEffect` below.
  const [companyInput, setCompanyInput] = useState(filters.company ?? '')
  const debouncedCompany = useDebouncedValue(companyInput, COMPANY_DEBOUNCE_MS)

  // Keep local input in sync if filters are reset from outside this
  // component (e.g. Board's "Clear filters" or a future external reset),
  // without this the text box would keep showing stale text after an
  // external clear.
  useEffect(() => {
    setCompanyInput(filters.company ?? '')
    // Intentionally reacts only to the committed `filters.company` prop,
    // not to `companyInput`/`debouncedCompany` — those are read here but
    // must NOT be dependencies, since this effect's whole job is to
    // overwrite them from the outside, and depending on the values it
    // overwrites would fight with the effect below over the source of truth.
  }, [filters.company])

  // Only fires an `onChange` when the DEBOUNCED value actually differs from
  // what's already committed — without that guard, this would fire on
  // every parent re-render (a new `filters`/`onChange` reference each time)
  // even when the debounced company text hasn't actually changed.
  useEffect(() => {
    if (debouncedCompany !== (filters.company ?? '')) {
      onChange({ ...filters, company: debouncedCompany })
    }
    // `filters`/`onChange` are deliberately omitted: they're fresh
    // references on every parent render, and depending on `debouncedCompany`
    // alone is what makes this fire only when the debounced company value
    // itself actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCompany])

  function handlePriorityChange(e) {
    const value = e.target.value
    // "All" (rendered as an empty option value) means "omit the param
    // entirely" — sending priority='' would hit the backend's `Priority`
    // enum-binding and 400, since '' isn't a valid enum constant.
    onChange({ ...filters, priority: value || undefined })
  }

  function handleStartDateChange(e) {
    onChange({ ...filters, startDate: e.target.value || undefined })
  }

  function handleEndDateChange(e) {
    onChange({ ...filters, endDate: e.target.value || undefined })
  }

  function handleClear() {
    setCompanyInput('')
    onChange({ company: undefined, priority: undefined, startDate: undefined, endDate: undefined })
  }

  const filtersActive = hasActiveFilters(filters)

  return (
    <div className="mb-4 rounded border border-slate/20 bg-card p-3">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate">Company</span>
          <input
            type="text"
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            placeholder="Search company…"
            className="rounded border border-slate/40 bg-paper px-2 py-1.5 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate">Priority</span>
          <select
            value={filters.priority ?? ''}
            onChange={handlePriorityChange}
            className="rounded border border-slate/40 bg-paper px-2 py-1.5 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
          >
            <option value="">All</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate">From</span>
          <input
            type="date"
            value={filters.startDate ?? ''}
            onChange={handleStartDateChange}
            className="rounded border border-slate/40 bg-paper px-2 py-1.5 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate">To</span>
          <input
            type="date"
            value={filters.endDate ?? ''}
            onChange={handleEndDateChange}
            className="rounded border border-slate/40 bg-paper px-2 py-1.5 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={handleClear}
          disabled={!filtersActive}
          className="font-mono text-xs uppercase tracking-wide text-stamp hover:text-stampLight disabled:cursor-not-allowed disabled:text-slate/50"
        >
          Clear filters
        </button>
      </div>

      {filtersActive && (
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-slate">
          Clear filters to reorder cards
        </p>
      )}
    </div>
  )
}

export default FilterBar
