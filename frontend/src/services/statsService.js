import api from './api'

// Thin wrapper around `/api/stats`, mirroring `applicationService.js`'s/
// `columnService.js`'s shape/conventions.

/**
 * Fetches the current user's full analytics payload — total count,
 * per-column breakdown, conversion funnel, per-week application counts,
 * and status distribution — in a single request. See
 * `backend/src/main/java/com/jobtracker/dto/stats/StatsResponse.java` for
 * the exact response shape; the frontend never re-derives any of these
 * numbers client-side, it only renders what the backend computed.
 *
 * @returns {Promise<object>} the `StatsResponse` payload
 */
export function getStats() {
  return api.get('/stats').then((res) => res.data)
}
