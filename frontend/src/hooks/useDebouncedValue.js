import { useEffect, useState } from 'react'

/**
 * Returns `value`, but only after it hasn't changed for `delayMs` — the
 * standard debounce-via-effect pattern. Generic and component-agnostic on
 * purpose: `FilterBar`'s company search is the first caller (Task 12), but
 * nothing here is specific to text input or to applications.
 *
 * Each call schedules a `setTimeout`; the effect's cleanup clears it before
 * the next one runs, so only the LAST value in a fast burst of changes
 * (e.g. keystrokes) ever survives long enough to actually update the
 * debounced output — every earlier scheduled update is cancelled before it
 * fires.
 *
 * @param {*} value the fast-changing value to debounce
 * @param {number} delayMs how long `value` must stay unchanged before the
 *   debounced value updates
 * @returns {*} `value`, delayed until it settles for `delayMs`
 */
export function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebounced(value), delayMs)
    // Cleanup runs before the NEXT effect (i.e. on every subsequent change
    // to `value` or `delayMs`, and on unmount) — this is what cancels the
    // previous timer so only the final value in a burst ever lands.
    return () => clearTimeout(timeoutId)
  }, [value, delayMs])

  return debounced
}
