import { useEffect, useState } from 'react'
import { validateRequired, validateUrlHint } from '../../utils/validators'
import ConfirmDialog from './ConfirmDialog'

/** Default form values for a brand-new (create-mode) application. */
const EMPTY_FORM = {
  company: '',
  role: '',
  priority: 'MEDIUM',
  jobUrl: '',
  location: '',
  salaryRange: '',
  appliedDate: '',
  followUpDate: '',
  notes: '',
}

/**
 * Modal for creating a new application (`mode="create"`) or editing an
 * existing one (`mode="edit"`); also owns the delete flow (edit mode only)
 * via a nested `ConfirmDialog`.
 *
 * Unlike Task 8's drag-and-drop (optimistic-update-with-rollback, since a
 * dragged card visually moves the instant you drop it), Save/Delete here
 * call `useApplications`' `createApplication`/`updateApplication`/
 * `deleteApplication` directly (threaded down as props rather than wrapped
 * in a separate `onSaved` callback — the hook functions already update the
 * board's local state on success, so there's nothing left for a wrapper to
 * do) and wait for them to resolve before closing. The modal's own
 * "Saving…"/"Deleting…" button state IS the feedback the user needs while
 * in flight, so there's no benefit to guessing the result ahead of the
 * network round-trip the way an instant-feel drag needs to. On failure,
 * those functions reject (see `useApplications.js`) and this component's
 * own try/catch shows the error inline while keeping the modal open for
 * retry — board state is left untouched.
 *
 * @param {object} props
 * @param {boolean} props.isOpen whether the modal is visible
 * @param {'create'|'edit'} props.mode
 * @param {object|null} [props.application] the existing application being
 *   edited (edit mode only; ignored/unused in create mode)
 * @param {string|null} [props.columnId] the destination column for a new
 *   application (create mode only; ignored/unused in edit mode)
 * @param {Function} props.onClose `() => void` — closes without saving
 * @param {Function} props.onCreate `(data) => Promise<object>` — creates an application
 * @param {Function} props.onUpdate `(id, data) => Promise<object>` — updates an application
 * @param {Function} props.onDelete `(id) => Promise<void>` — deletes an application
 */
function ApplicationModal({ isOpen, mode, application, columnId, onClose, onCreate, onUpdate, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // (Re)populate the form every time the modal is opened for a (possibly
  // different) application, rather than trying to diff field-by-field —
  // the simplest way to guarantee stale data from a previously-edited card
  // never leaks into the next one opened.
  useEffect(() => {
    if (!isOpen) return
    setFieldErrors({})
    setFormError(null)
    setConfirmDeleteOpen(false)
    if (mode === 'edit' && application) {
      setForm({
        company: application.company ?? '',
        role: application.role ?? '',
        priority: application.priority ?? 'MEDIUM',
        jobUrl: application.jobUrl ?? '',
        location: application.location ?? '',
        salaryRange: application.salaryRange ?? '',
        appliedDate: application.appliedDate ?? '',
        followUpDate: application.followUpDate ?? '',
        notes: application.notes ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [isOpen, mode, application, columnId])

  // Escape closes the modal — but only when the delete confirmation isn't
  // itself open (ConfirmDialog owns Escape in that case; one press should
  // cancel just the delete step, not both dialogs in one keystroke) and
  // not mid-save (an in-flight request shouldn't be silently abandoned by
  // a stray key press).
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !confirmDeleteOpen && !submitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, confirmDeleteOpen, submitting, onClose])

  if (!isOpen) return null

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  /** Required-field validation, run before any network call — same "validate before network" discipline as Login/Register (Task 7). */
  function validate() {
    const errors = {
      company: validateRequired(form.company, 'Company'),
      role: validateRequired(form.role, 'Role'),
    }
    setFieldErrors(errors)
    return Object.values(errors).every((err) => err === null)
  }

  /**
   * Builds the `ApplicationRequest`-shaped payload from form state. Blank
   * optional fields are sent as `null` (not `""`) so the backend actually
   * stores null rather than an empty string — verified explicitly in this
   * task's manual test pass via `GET /api/applications`.
   */
  function buildPayload() {
    return {
      // The backend's ApplicationRequest requires a non-blank columnId even
      // on update (it's a @NotBlank field on the shared DTO), though
      // updateApplication() deliberately ignores it server-side — only the
      // separate /move endpoint ever changes columnId. Sending the card's
      // current columnId here satisfies validation without pretending this
      // form can move cards between columns.
      columnId: mode === 'create' ? columnId : application.columnId,
      company: form.company.trim(),
      role: form.role.trim(),
      jobUrl: form.jobUrl.trim() || null,
      location: form.location.trim() || null,
      salaryRange: form.salaryRange.trim() || null,
      appliedDate: form.appliedDate || null,
      followUpDate: form.followUpDate || null,
      priority: form.priority,
      notes: form.notes.trim() || null,
    }
  }

  async function handleSave(e) {
    e.preventDefault()

    // Defense-in-depth reentrancy guard: the Save button's `disabled`
    // attribute already prevents a second click while a save is in
    // flight, but that's a synchronous DOM update racing a very fast
    // second click/Enter-submit. Bailing out here removes any doubt —
    // a submit that arrives while one is already in flight is a no-op.
    if (submitting) return

    setFormError(null)

    // Guard clause: bail out before touching the network at all if
    // client-side validation fails.
    if (!validate()) return

    setSubmitting(true)
    try {
      const payload = buildPayload()
      if (mode === 'create') {
        await onCreate(payload)
      } else {
        await onUpdate(application.id, payload)
      }
      onClose()
    } catch (err) {
      setFormError(err.response?.data?.message ?? 'Failed to save application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    try {
      await onDelete(application.id)
      setConfirmDeleteOpen(false)
      onClose()
    } catch (err) {
      setConfirmDeleteOpen(false)
      setFormError(err.response?.data?.message ?? 'Failed to delete application. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const urlHint = validateUrlHint(form.jobUrl)
  const busy = submitting || deleting

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 px-4 py-8"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="application-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded border border-slate/30 bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="application-modal-title"
            className="font-mono text-sm font-semibold uppercase tracking-widest text-ink"
          >
            {mode === 'create' ? 'New Application' : 'Edit Application'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="font-mono text-xs uppercase tracking-wide text-slate hover:text-ink"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="company" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
                Company*
              </label>
              <input
                id="company"
                value={form.company}
                onChange={(e) => updateField('company', e.target.value)}
                className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
              />
              {fieldErrors.company && <p className="mt-1 text-xs text-rust">{fieldErrors.company}</p>}
            </div>
            <div>
              <label htmlFor="role" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
                Role*
              </label>
              <input
                id="role"
                value={form.role}
                onChange={(e) => updateField('role', e.target.value)}
                className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
              />
              {fieldErrors.role && <p className="mt-1 text-xs text-rust">{fieldErrors.role}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="priority" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
              Priority*
            </label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => updateField('priority', e.target.value)}
              className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="jobUrl" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
              Job URL
            </label>
            <input
              id="jobUrl"
              value={form.jobUrl}
              onChange={(e) => updateField('jobUrl', e.target.value)}
              placeholder="https://…"
              className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
            />
            {/* Soft hint only — never blocks submission, per the backend's
                own design note that jobUrl has no format constraint. */}
            {urlHint && <p className="mt-1 text-xs text-amber">{urlHint}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
                Location
              </label>
              <input
                id="location"
                value={form.location}
                onChange={(e) => updateField('location', e.target.value)}
                className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="salaryRange" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
                Salary Range
              </label>
              <input
                id="salaryRange"
                value={form.salaryRange}
                onChange={(e) => updateField('salaryRange', e.target.value)}
                className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="appliedDate" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
                Applied Date
              </label>
              <input
                id="appliedDate"
                type="date"
                value={form.appliedDate}
                onChange={(e) => updateField('appliedDate', e.target.value)}
                className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="followUpDate"
                className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate"
              >
                Follow-up Date
              </label>
              <input
                id="followUpDate"
                type="date"
                value={form.followUpDate}
                onChange={(e) => updateField('followUpDate', e.target.value)}
                className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full rounded border border-slate/40 bg-paper px-3 py-2 font-sans text-sm text-ink focus:border-stamp focus:outline-none"
            />
          </div>

          {formError && <p className="text-sm text-rust">{formError}</p>}

          <div className="flex items-center justify-between gap-3 pt-2">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={busy}
                className="rounded border border-rust/50 px-4 py-2 font-mono text-xs uppercase tracking-wide text-rust hover:bg-rust/10 disabled:opacity-60"
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded border border-slate/40 px-4 py-2 font-mono text-xs uppercase tracking-wide text-slate hover:text-ink disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-stamp px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper hover:bg-stampLight disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Application"
        message="Delete this application? This can't be undone."
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        cancelLabel="Cancel"
        destructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => !deleting && setConfirmDeleteOpen(false)}
      />
    </div>
  )
}

export default ApplicationModal
