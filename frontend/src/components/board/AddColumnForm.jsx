import { useState } from 'react'

/**
 * Small inline "add column" form rendered at the end of the column list.
 *
 * @param {object} props
 * @param {Function} props.onCreate (name) => Promise — creates the column
 */
function AddColumnForm({ onCreate }) {
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      await onCreate(trimmed)
      setName('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-72 shrink-0 flex-col gap-2 rounded border border-dashed border-slate/40 p-3"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New column name"
        className="w-full rounded border border-slate/40 bg-card px-2 py-1.5 text-sm text-ink focus:border-stamp focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="rounded bg-stamp py-1.5 font-mono text-xs uppercase tracking-wide text-paper hover:bg-stampLight disabled:opacity-60"
      >
        Add Column
      </button>
    </form>
  )
}

export default AddColumnForm
