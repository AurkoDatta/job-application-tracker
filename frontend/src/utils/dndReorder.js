// Pure, framework-agnostic helpers for computing the new application
// arrangement after a drag-and-drop reorder, and for diffing that result
// against the pre-drag state to find exactly which cards need a network
// call. Kept out of KanbanBoard/useApplications and unit-testable in
// isolation, per the project's convention of pulling non-obvious index
// math into its own module.
//
// WHY THIS FILE EXISTS (read before touching `useApplications` or
// `KanbanBoard`): the backend's `PATCH /api/applications/{id}/move`
// (see `ApplicationService#moveApplication`) persists exactly the
// `columnId`/`order` it's given and does NOT shift or renumber any other
// application's `order`. `order` is a plain integer, not a float or
// fractional-index scheme, so there is no way to ask the backend to slot a
// card "between" order 3 and order 4 with a single value — the frontend
// must own keeping every column's `order` values a gapless 0..n-1 sequence
// after every single drag, for every card whose position actually changed.
// These functions are the one place that math happens, so `useApplications`
// can just call them and diff the result rather than re-deriving index
// arithmetic inline in the drag event handler.

/**
 * Reorders a single column's applications after a same-column drag.
 *
 * @param {Array<{id: string, columnId: string, order: number}>} applications
 *   the column's applications, already sorted by `order` ascending (one
 *   array — a same-column drag never touches another column's list)
 * @param {number} sourceIndex the dragged card's index before the drop
 * @param {number} destIndex the dragged card's index after the drop
 * @returns {Array<object>} a new array (same length, new objects where
 *   `order` changed) with every card's `order` renumbered sequentially
 *   (0, 1, 2, ...) to match its new position. Renumbering — not just
 *   reordering the array — is required because `order` is what actually
 *   gets persisted; an array whose element order reflects the new
 *   arrangement but whose `order` fields still hold their old values would
 *   send the backend nothing useful.
 */
export function reorderWithinColumn(applications, sourceIndex, destIndex) {
  const result = Array.from(applications)
  const [moved] = result.splice(sourceIndex, 1)
  result.splice(destIndex, 0, moved)
  return renumber(result)
}

/**
 * Moves a card from one column's list into another after a cross-column
 * drag, renumbering both resulting lists.
 *
 * @param {Array<object>} sourceApplications the source column's
 *   applications, sorted by `order` ascending, BEFORE the move
 * @param {Array<object>} destApplications the destination column's
 *   applications, sorted by `order` ascending, BEFORE the move
 * @param {number} sourceIndex the dragged card's index within `sourceApplications`
 * @param {number} destIndex the index the card should land at within `destApplications`
 * @param {string} destColumnId the destination column's id — passed
 *   explicitly rather than inferred from `destApplications`, since a card
 *   dropped into an empty column has no sibling there to infer it from
 * @returns {{newSourceApplications: Array<object>, newDestApplications: Array<object>}}
 *   both lists, renumbered sequentially. `newSourceApplications` needs
 *   renumbering too, not just `newDestApplications` — removing a card from
 *   the middle of a column leaves a gap (e.g. orders 0,1,3 after removing
 *   what used to be order 2), and the backend won't close that gap on its
 *   own (see file header).
 */
export function moveAcrossColumns(sourceApplications, destApplications, sourceIndex, destIndex, destColumnId) {
  const newSource = Array.from(sourceApplications)
  const [moved] = newSource.splice(sourceIndex, 1)

  const newDest = Array.from(destApplications)
  newDest.splice(destIndex, 0, { ...moved, columnId: destColumnId })

  return {
    newSourceApplications: renumber(newSource),
    newDestApplications: renumber(newDest),
  }
}

/**
 * Renumbers a list's `order` field to a gapless 0..n-1 sequence matching
 * array position. Returns new objects only for entries whose `order`
 * actually changed (identity-preserving otherwise) so callers that diff by
 * reference/value elsewhere aren't churned unnecessarily, and never
 * mutates its input — callers rely on the pre-drag arrays staying untouched
 * for rollback/diffing.
 */
function renumber(applications) {
  return applications.map((app, index) => (app.order === index ? app : { ...app, order: index }))
}

/**
 * Diffs a post-drag arrangement against the pre-drag snapshot to find only
 * the applications that actually need a `PATCH /move` call.
 *
 * Only `columnId`/`order` are compared (not every field) — this function
 * only ever runs on the output of `reorderWithinColumn`/`moveAcrossColumns`,
 * neither of which touches any other field, so comparing more would be
 * dead code. Most cards in an affected column are untouched by any given
 * drag (e.g. everything before the drop point in a same-column reorder
 * keeps its index and thus its order), so skipping unchanged cards is the
 * difference between one or two network calls and blasting every card in
 * the column on every drag.
 *
 * @param {Array<{id: string, columnId: string, order: number}>} before
 *   the applications involved in the drag, pre-move
 * @param {Array<object>} after the same applications, post-move
 * @returns {Array<{id: string, columnId: string, order: number}>} one
 *   entry per application whose `columnId` and/or `order` changed
 */
export function diffOrderChanges(before, after) {
  const beforeById = new Map(before.map((app) => [app.id, app]))

  return after
    .filter((app) => {
      const prev = beforeById.get(app.id)
      // A card with no `before` counterpart shouldn't happen in practice —
      // `before`/`after` are always drawn from the same underlying set —
      // but if it did, treating it as "changed" (rather than silently
      // skipping it) is the safer failure mode.
      return !prev || prev.columnId !== app.columnId || prev.order !== app.order
    })
    .map((app) => ({ id: app.id, columnId: app.columnId, order: app.order }))
}
