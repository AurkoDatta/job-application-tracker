// Pure date-formatting/comparison helpers for bare `yyyy-MM-dd` date
// strings (the shape the backend sends for `followUpDate`, a Java
// `LocalDate` with no time component). Every function here treats such a
// string as a calendar date, never as a timezone-aware instant — see
// `daysUntil` below for why that distinction matters.

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/**
 * Splits a bare `yyyy-MM-dd` string into its numeric year/month/day parts.
 * Shared by every function below so none of them ever hands a raw date
 * string to `new Date(...)` (see `daysUntil`'s comment for why that
 * constructor is the thing to avoid here).
 *
 * @param {string} dateString an ISO `yyyy-MM-dd` date (e.g. `"2026-08-12"`)
 * @returns {{year: number, month: number, day: number}} `month` is 1-indexed
 *   (January = 1), matching the string's own format — NOT JavaScript's
 *   0-indexed `Date` month.
 */
function parseDateParts(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return { year, month, day }
}

/**
 * Formats a bare `yyyy-MM-dd` date string as a human-readable date, e.g.
 * `"Aug 12, 2026"`. Built from the string's own year/month/day components
 * rather than via `toLocaleDateString()` — that default can render
 * differently across browsers/locales/environments, which would make any
 * test asserting on the exact output string fragile. This format is fixed
 * regardless of where the code runs.
 *
 * @param {string} dateString an ISO `yyyy-MM-dd` date
 * @returns {string} e.g. `"Aug 12, 2026"`
 */
export function formatDate(dateString) {
  const { year, month, day } = parseDateParts(dateString)
  return `${MONTH_ABBREVIATIONS[month - 1]} ${day}, ${year}`
}

/**
 * Returns the number of calendar days from today to `dateString` (today =
 * 0, tomorrow = 1, yesterday = -1, etc).
 *
 * Deliberately NOT `new Date(dateString) - new Date()` divided into days.
 * A bare `yyyy-MM-dd` string is parsed by the `Date` constructor as UTC
 * midnight (per the ISO 8601 spec `Date` follows), while `new Date()` for
 * "today" is the current instant in the *local* timezone. Subtracting
 * those two mixes a UTC-midnight instant against a local "now" that's
 * offset from its own local midnight by both the timezone offset AND the
 * current time of day — the millisecond difference is almost never an
 * exact multiple of 24h, so flooring/rounding it into a day count is off
 * by one for a large chunk of the day in any timezone that isn't UTC
 * (e.g. `followUpDate: "2026-08-08"` checked at 8pm US/Eastern would
 * compute a small negative fractional-day diff for "today" and round to
 * -1, misclassifying it as overdue/past instead of today).
 *
 * Instead, both dates are reduced to their own calendar-date components
 * and re-anchored at UTC midnight via `Date.UTC` before diffing. `Date.UTC`
 * never applies a timezone offset or DST adjustment, so two calendar dates
 * built this way always differ by an exact whole number of 24h days —
 * comparing "which calendar date is this" instead of "how many
 * milliseconds apart are these two instants."
 *
 * @param {string} dateString an ISO `yyyy-MM-dd` date
 * @returns {number} whole days from today to `dateString`; negative for
 *   past dates
 */
export function daysUntil(dateString) {
  const { year, month, day } = parseDateParts(dateString)
  const targetUtc = Date.UTC(year, month - 1, day)

  const now = new Date()
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())

  const MS_PER_DAY = 24 * 60 * 60 * 1000
  return Math.round((targetUtc - todayUtc) / MS_PER_DAY)
}

/**
 * Human-friendly relative label for a date, based on `daysUntil`. Only
 * ever called by this task with values already filtered to 0-7, but
 * handles the full range sanely (including past dates) so it stays
 * correct if reused elsewhere later.
 *
 * @param {string} dateString an ISO `yyyy-MM-dd` date
 * @returns {string} `"Today"`, `"Tomorrow"`, `"in N days"` for future
 *   dates, `"Yesterday"`/`"N days ago"` for past dates
 */
export function formatRelativeLabel(dateString) {
  const days = daysUntil(dateString)

  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days > 1) return `in ${days} days`
  if (days === -1) return 'Yesterday'
  return `${Math.abs(days)} days ago`
}
