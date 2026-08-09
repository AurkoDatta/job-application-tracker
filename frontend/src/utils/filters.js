// Single source of truth for "is any filter actually set" — used by both
// `Board.jsx` (to show the "clear filters to reorder" note near the filter
// bar) and `KanbanBoard.jsx` (to derive `dragDisabled`). Keeping this in one
// place means the two can never silently disagree about what counts as
// "active" (e.g. one treating `''` as set and the other not).

/**
 * Whether any field in `filters` is actually set. Empty string, `undefined`,
 * and `null` all count as "not set" — a `FilterBar` field reset to its
 * default (blank text input, "All" priority, empty date) must be
 * indistinguishable from a filter that was never touched.
 *
 * @param {{company?: string, priority?: string, startDate?: string, endDate?: string}} [filters]
 * @returns {boolean}
 */
export function hasActiveFilters(filters) {
  if (!filters) return false
  return Boolean(filters.company || filters.priority || filters.startDate || filters.endDate)
}
