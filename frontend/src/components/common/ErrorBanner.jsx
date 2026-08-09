/**
 * Reusable, optionally-dismissible error message banner, styled with the
 * `rust` design token per the design system (see `tailwind.config.js`) —
 * `rust`-tinted border/background, `rust` text, `font-sans` body copy.
 *
 * Extracted from the several near-identical ad-hoc error `<div>`s
 * duplicated across `KanbanBoard`, `Stats`, `Login`, `Register`, and
 * `ApplicationModal` — this is the single shared shape for "something went
 * wrong, here's the backend's (or a client-side fallback) message."
 *
 * `onDismiss` is deliberately optional rather than required: pass it where
 * the caller already has a "clear this error" action to wire up (e.g.
 * `KanbanBoard`'s `clearColumnsError`/`clearApplicationsError`), and omit
 * it wherever the error simply clears itself on the next relevant action
 * (e.g. a form's error is reset automatically at the top of its next submit
 * handler) — the Dismiss button is only rendered when there's somewhere for
 * it to actually go, rather than every caller being forced to invent a
 * no-op handler just to satisfy a required prop.
 *
 * @param {object} props
 * @param {string} props.message the error text to display
 * @param {Function} [props.onDismiss] called when the Dismiss button is
 *   clicked; the button itself is omitted entirely when this isn't passed
 */
function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded border border-rust/40 bg-rust/10 px-4 py-2 font-sans text-sm text-rust">
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="font-mono text-xs uppercase tracking-wide text-rust hover:text-rust/80"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}

export default ErrorBanner
