import { useCallback, useEffect, useState } from 'react'
import * as columnService from '../services/columnService'

/**
 * Fetches and manages the current user's Kanban columns.
 *
 * Columns change far less often than applications (there is no
 * drag-and-drop reordering for columns in this plan — see
 * task-8-brief.md), so mutations here use a simple "call the backend, then
 * refetch" pattern rather than the optimistic-update-with-rollback
 * machinery `useApplications` needs for drag-and-drop. A failed mutation
 * sets `error` (reused for both the initial fetch and any mutation, since
 * both are equally "something about columns went wrong") without
 * rendering a stale/optimistic column list.
 *
 * @returns {{columns: Array<object>, loading: boolean, refreshing: boolean,
 *   error: string|null, createColumn: Function, renameColumn: Function,
 *   deleteColumn: Function, refetch: Function, clearError: Function}}
 */
export function useColumns() {
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
  // Separate from `loading`: `loading` is reserved for the true initial
  // mount fetch (below), while `refreshing` covers every post-mutation
  // refetch (create/rename/delete). Without this split, every small column
  // edit re-set the same `loading` flag consumers use to decide whether to
  // render the board at all, which unmounted/remounted the drag-and-drop
  // tree on every edit — a visible full-board flash for what should be an
  // invisible background refresh.
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const fetchColumns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await columnService.getColumns()
      // Defensive client-side sort: the backend already returns columns
      // ordered by `order`, but silently trusting that means a future
      // backend change could break the board's column layout with no
      // signal here — a client-side `.sort()` is one line of cheap
      // insurance either way.
      setColumns([...data].sort((a, b) => a.order - b.order))
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load columns.')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Same fetch as `fetchColumns`, but tracked via `refreshing` instead of
   * `loading` — used for every post-mutation refetch so consumers can keep
   * rendering the current board (rather than unmounting it) while the
   * refreshed list comes back.
   */
  const refreshColumns = useCallback(async () => {
    try {
      setRefreshing(true)
      setError(null)
      const data = await columnService.getColumns()
      setColumns([...data].sort((a, b) => a.order - b.order))
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load columns.')
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchColumns()
  }, [fetchColumns])

  /**
   * Creates a column and refetches so `columns` reflects the backend's
   * assigned id/order.
   * @param {string} name
   */
  async function createColumn(name) {
    try {
      await columnService.createColumn({ name })
      await refreshColumns()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create column.')
    }
  }

  /**
   * Renames a column and refetches.
   * @param {string} id
   * @param {string} name
   */
  async function renameColumn(id, name) {
    try {
      await columnService.updateColumn(id, { name })
      await refreshColumns()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to rename column.')
    }
  }

  /**
   * Deletes a column and refetches.
   * @param {string} id
   */
  async function deleteColumn(id) {
    try {
      await columnService.deleteColumn(id)
      await refreshColumns()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to delete column.')
    }
  }

  return {
    columns,
    loading,
    refreshing,
    error,
    createColumn,
    renameColumn,
    deleteColumn,
    refetch: fetchColumns,
    clearError: () => setError(null),
  }
}
