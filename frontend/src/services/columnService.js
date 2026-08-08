import api from './api'

// Thin wrappers around `/api/columns`, mirroring `applicationService.js`'s
// shape/conventions.

/**
 * Fetches the current user's columns.
 *
 * @returns {Promise<Array<{id: string, userId: string, name: string, order: number}>>}
 *   the user's columns, ordered ascending by `order`
 */
export function getColumns() {
  return api.get('/columns').then((res) => res.data)
}

/**
 * Creates a new column, appended at the end. `order` is deliberately
 * omitted from the request body — `ColumnRequest.order` is optional and
 * means "append at the end" on create when absent, so there's no client
 * math to duplicate here.
 *
 * @param {{name: string}} column
 * @returns {Promise<object>} the created column
 */
export function createColumn({ name }) {
  return api.post('/columns', { name }).then((res) => res.data)
}

/**
 * Renames a column. `order` is likewise omitted here — it means "leave
 * unchanged" on update when absent, and this task never reorders columns
 * themselves (no column drag-and-drop in this plan, only application
 * drag-and-drop).
 *
 * @param {string} id
 * @param {{name: string}} column
 * @returns {Promise<object>} the updated column
 */
export function updateColumn(id, { name }) {
  return api.put(`/columns/${id}`, { name }).then((res) => res.data)
}

/**
 * Deletes a column.
 *
 * @param {string} id
 * @returns {Promise<void>}
 */
export function deleteColumn(id) {
  return api.delete(`/columns/${id}`).then(() => undefined)
}
