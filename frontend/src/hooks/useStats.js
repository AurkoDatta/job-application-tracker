import { useCallback, useEffect, useState } from 'react'
import * as statsService from '../services/statsService'

/**
 * Fetches the current user's `/api/stats` payload on mount.
 *
 * Read-only — unlike `useApplications`/`useColumns` there are no mutations
 * here, so this hook is deliberately simpler: just fetch-on-mount plus a
 * `refetch` escape hatch (e.g. for a future "refresh" button), matching
 * the loading/error convention already established by the other two
 * hooks (`loading` true until the first fetch settles, `error` a
 * human-readable string or `null`).
 *
 * @returns {{stats: object|null, loading: boolean, error: string|null,
 *   refetch: Function}}
 */
export function useStats() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await statsService.getStats()
      setStats(data)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load stats.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}
