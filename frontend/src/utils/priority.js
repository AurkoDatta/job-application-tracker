// Shared priority → design-token mapping. Generic and board-agnostic on
// purpose: `ApplicationCard` uses it now, and Task 11's stats charts will
// reuse the same mapping so a priority always renders as the same color
// everywhere in the app rather than each feature inventing its own palette.

/**
 * Maps each `Priority` enum value (as returned by the backend) to the
 * Tailwind color token (from `tailwind.config.js`) used to render it.
 */
export const PRIORITY_COLORS = {
  LOW: 'moss',
  MEDIUM: 'amber',
  HIGH: 'rust',
}

/** Human-readable label for each `Priority` enum value. */
export const PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}
