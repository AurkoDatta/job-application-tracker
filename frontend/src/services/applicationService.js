import api from './api'

// Thin wrappers around `/api/applications`: listing/moving (Task 8's
// Kanban board) plus create/update/delete (Task 9's create/edit modal).

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

/**
 * Creates a new application card.
 *
 * @param {object} data fields matching the backend's `ApplicationRequest`
 *   (`columnId`, `company`, `role`, `priority` required; the rest optional)
 * @returns {Promise<object>} the created application, as returned by the backend
 */
export function createApplication(data) {
  return api.post('/applications', data).then((res) => res.data)
}

/**
 * Fully edits an existing application's fields. Per the backend's own
 * design (Task 4), this can never move the card between columns — `data`
 * must still include a non-blank `columnId` (the DTO requires it), but the
 * backend deliberately ignores it here; only the drag-and-drop `/move`
 * endpoint changes `columnId`/`order`.
 *
 * @param {string} id the application's id
 * @param {object} data fields matching the backend's `ApplicationRequest`
 * @returns {Promise<object>} the updated application
 */
export function updateApplication(id, data) {
  return api.put(`/applications/${id}`, data).then((res) => res.data)
}

/**
 * Deletes an application card. There is no separate "archive" endpoint —
 * this is a hard delete, so the caller (the edit modal) is responsible for
 * confirming with the user first.
 *
 * @param {string} id the application's id
 * @returns {Promise<void>}
 */
export function deleteApplication(id) {
  return api.delete(`/applications/${id}`).then(() => undefined)
}
