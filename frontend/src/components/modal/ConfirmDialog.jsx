import { useEffect } from 'react'

/**
 * Generic, reusable confirmation dialog (e.g. "Delete this application?").
 * Not application-specific — anything needing a confirm/cancel step can
 * reuse this rather than each caller rolling its own.
 *
 * Keyboard: Escape always cancels, regardless of which element has focus —
 * cancelling is safe to make easy. Confirming is not given the same
 * shortcut: there is no document-level "Enter confirms" listener here, so
 * a destructive confirm only ever fires from an explicit click on the
 * confirm button (or a native Enter-activates-the-focused-button press,
 * which requires the user to have actually tabbed/clicked onto that
 * specific button first — never a stray Enter typed elsewhere in the
 * page). That was the deliberate choice for this dialog: cancel is one key
 * anywhere, confirm requires actually being on the confirm control.
 *
 * @param {object} props
 * @param {boolean} props.isOpen whether the dialog is visible
 * @param {string} props.title dialog heading
 * @param {string} props.message body copy
 * @param {string} [props.confirmLabel] confirm button label, default 'Confirm'
 * @param {string} [props.cancelLabel] cancel button label, default 'Cancel'
 * @param {boolean} [props.destructive] whether the confirmed action is
 *   destructive — styles the confirm button with `rust` instead of `stamp`
 *   when true (default true, since the only caller today is a delete flow)
 * @param {Function} props.onConfirm called when the confirm button is clicked
 * @param {Function} props.onCancel called on cancel click, backdrop click, or Escape
 */
function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4"
      // stopPropagation matters here: this dialog is typically mounted
      // nested inside another modal's own backdrop (e.g. ApplicationModal).
      // Without it, a click on THIS backdrop would cancel the confirm step
      // and then keep bubbling up into the parent modal's backdrop handler,
      // closing that too — one click silently doing two things.
      onClick={(e) => {
        e.stopPropagation()
        onCancel?.()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded border border-slate/30 bg-card p-6 shadow-lg"
      >
        <h2
          id="confirm-dialog-title"
          className="mb-2 font-mono text-sm font-semibold uppercase tracking-widest text-ink"
        >
          {title}
        </h2>
        <p className="mb-6 font-sans text-sm text-ink/80">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-slate/40 px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-slate hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-paper ${
              destructive ? 'bg-rust hover:bg-rust/80' : 'bg-stamp hover:bg-stampLight'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
