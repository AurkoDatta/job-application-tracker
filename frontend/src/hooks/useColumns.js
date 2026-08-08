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
 * @returns {{columns: Array<object>, loading: boolean, error: string|null,
 *   createColumn: Function, renameColumn: Function, deleteColumn: Function,
 *   refetch: Function, clearError: Function}}
 */
export function useColumns() {
  const [columns, setColumns] = useState([])
  const [loading, setLoading] = useState(true)
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
      await fetchColumns()
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
      await fetchColumns()
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
      await fetchColumns()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to delete column.')
    }
  }

  return {
    columns,
    loading,
    error,
    createColumn,
    renameColumn,
    deleteColumn,
    refetch: fetchColumns,
    clearError: () => setError(null),
  }
}
