import api from './api'

// Thin wrappers around `/api/applications` for what Task 8's Kanban board
// needs: listing the board's cards and moving one via drag-and-drop.
// `createApplication`/`updateApplication`/`deleteApplication` are Task 9's
// job (the create/edit modal) — deliberately left unstubbed here rather
// than adding dead exports with no caller yet.

/**
 * Fetches the current user's applications, optionally filtered.
 *
 * @param {{company?: string, priority?: string, startDate?: string, endDate?: string}} [params]
 *   optional query filters, matching the backend's `GET /api/applications`
 *   contract. Unused by this task (Task 12 adds a filter UI) but accepted
 *   now so `useApplications` doesn't need a signature change later.
 * @returns {Promise<Array<object>>} the matching applications, sorted by
 *   columnId then order (per the backend's `listApplications`)
 */
export function getApplications(params = {}) {
  return api.get('/applications', { params }).then((res) => res.data)
}

/**
 * Moves an application to a new column/position (drag-and-drop).
 *
 * @param {string} id the application's id
 * @param {{columnId: string, order: number}} destination the exact
 *   destination column and order — the backend persists these verbatim
 *   with no shifting of sibling applications; see
 *   `frontend/src/utils/dndReorder.js` for why the frontend must compute
 *   the full renumbered destination itself before calling this.
 * @returns {Promise<void>}
 */
export function moveApplication(id, destination) {
  return api.patch(`/applications/${id}/move`, destination).then(() => undefined)
}
