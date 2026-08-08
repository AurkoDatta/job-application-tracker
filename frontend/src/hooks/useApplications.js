import { useCallback, useEffect, useState } from 'react'
import * as applicationService from '../services/applicationService'
import { diffOrderChanges, moveAcrossColumns, reorderWithinColumn } from '../utils/dndReorder'

/**
 * Fetches and manages the current user's applications, and owns the
 * optimistic-update-with-rollback drag-and-drop move flow (see
 * `frontend/src/utils/dndReorder.js` for why the frontend, not the
 * backend, must renumber sibling `order` values on every drag).
 *
 * State is kept as a single flat array mirroring the backend's shape
 * (never pre-grouped by column) — `KanbanBoard`/`KanbanColumn` derive
 * per-column, order-sorted views from it as needed. Keeping one flat array
 * (rather than a `{columnId: [...]}` map) means `moveApplication` only
 * ever needs to splice updated-by-id entries into one array, which is also
 * what makes the rollback snapshot below a single existing array reference
 * — no deep-cloning required, since nothing here ever mutates an
 * application object in place.
 *
 * @returns {{applications: Array<object>, loading: boolean, error: string|null,
 *   moveApplication: Function, refetch: Function, clearError: Function}}
 */
export function useApplications() {
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      // No filter params yet (Task 12 adds a filter UI) — omitting them
      // matches the backend's "no filters = all applications" behavior.
      const data = await applicationService.getApplications()
      setApplications(data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load applications.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  /**
   * Applies a drag-and-drop result from `@hello-pangea/dnd`'s
   * `onDragEnd(result)`. Implements the project's confirmed
   * optimistic-update-with-rollback design for board moves:
   *
   * 1. Compute the new local arrangement (`reorderWithinColumn` for a
   *    same-column drag, `moveAcrossColumns` for a cross-column one).
   * 2. Both helpers renumber every affected column's `order` sequentially
   *    — required because the backend's `/move` endpoint persists exactly
   *    the value it's given and never shifts siblings (see
   *    `dndReorder.js`'s file header).
   * 3. Diff the renumbered result against the pre-drag snapshot so only
   *    applications whose `columnId`/`order` actually changed get a
   *    network call.
   * 4. Apply the optimistic update to local state immediately — the board
   *    must feel instant, not wait on the network round-trip.
   * 5. Fire one `PATCH /move` per changed application (`Promise.all`,
   *    since they're independent of each other).
   * 6. If ANY of those calls fails, roll the WHOLE board back to the
   *    pre-drag snapshot (see comment at the catch block below for why
   *    whole-board, not per-card) and surface an error.
   *
   * @param {import('@hello-pangea/dnd').DropResult} result the raw
   *   onDragEnd result: `{source: {droppableId, index}, destination:
   *   {droppableId, index}|null, ...}` — `droppableId` is the column id
   *   since `KanbanColumn` uses `<Droppable droppableId={column.id}>`.
   */
  async function moveApplication(result) {
    const { source, destination } = result

    // Dropped outside any droppable, or dropped back into its exact
    // original spot — nothing actually changed, so there's nothing to
    // diff or persist. Bailing out early here also means a no-op drag
    // never touches the rollback snapshot logic below.
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const sourceColumnId = source.droppableId
    const destColumnId = destination.droppableId

    // Snapshot BEFORE any local mutation — this exact array is what gets
    // restored verbatim if any PATCH call below fails. Cheap to keep
    // around: it's just the current `applications` reference, since
    // nothing mutates application objects in place.
    const snapshot = applications

    const byColumn = (columnId) =>
      snapshot.filter((app) => app.columnId === columnId).sort((a, b) => a.order - b.order)

    let changedApplications
    let nextApplications

    if (sourceColumnId === destColumnId) {
      const columnApps = byColumn(sourceColumnId)
      const reordered = reorderWithinColumn(columnApps, source.index, destination.index)
      changedApplications = diffOrderChanges(columnApps, reordered)
      nextApplications = applyUpdates(snapshot, reordered)
    } else {
      const sourceApps = byColumn(sourceColumnId)
      const destApps = byColumn(destColumnId)
      const { newSourceApplications, newDestApplications } = moveAcrossColumns(
        sourceApps,
        destApps,
        source.index,
        destination.index,
        destColumnId,
      )
      changedApplications = diffOrderChanges(
        [...sourceApps, ...destApps],
        [...newSourceApplications, ...newDestApplications],
      )
      nextApplications = applyUpdates(snapshot, [...newSourceApplications, ...newDestApplications])
    }

    // Optimistic update: applied before any network call resolves so the
    // board reflects the drag instantly.
    setApplications(nextApplications)
    setError(null)

    try {
      await Promise.all(
        changedApplications.map(({ id, columnId, order }) =>
          applicationService.moveApplication(id, { columnId, order }),
        ),
      )
    } catch (err) {
      // Roll the ENTIRE board back to the pre-drag snapshot rather than
      // attempting a per-card rollback. With `Promise.all`, a failure
      // means we don't reliably know which of the parallel PATCH calls
      // landed and which didn't (some may have succeeded before the one
      // that rejected) — reconciling that per-card would require tracking
      // partial success and is far more error-prone to get right than
      // reverting to a known-good state and letting the user re-drag.
      // This is the project's confirmed "optimistic update + rollback"
      // design decision (see task-8-brief.md).
      setApplications(snapshot)
      setError(err.response?.data?.message ?? 'Failed to save the move — reverted.')
    }
  }

  return {
    applications,
    loading,
    error,
    moveApplication,
    refetch: fetchApplications,
    clearError: () => setError(null),
  }
}

/**
 * Returns a new flat array with every application in `updated` replacing
 * its counterpart (matched by `id`) in `base`; every application not
 * present in `updated` is left untouched. Used to fold a renumbered column
 * (or pair of columns) back into the full flat `applications` list without
 * disturbing applications in unaffected columns.
 */
function applyUpdates(base, updated) {
  const updatedById = new Map(updated.map((app) => [app.id, app]))
  return base.map((app) => updatedById.get(app.id) ?? app)
}
