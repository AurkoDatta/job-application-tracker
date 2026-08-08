// Client-side validation helpers shared by Login/Register forms. These
// mirror (but do not replace) the backend's Bean Validation rules — running
// the same checks client-side lets obviously-invalid submissions be
// rejected without a network round trip, while the backend remains the
// source of truth for anything that reaches it regardless.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validates an email address's basic shape (local-part@domain.tld).
 *
 * @param {string} email the value to check
 * @returns {string|null} an error message, or null if valid
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return 'Email is required'
  }
  if (!EMAIL_PATTERN.test(email.trim())) {
    return 'Enter a valid email address'
  }
  return null
}

/**
 * Validates a password's minimum length, matching the backend's
 * `@Size(min = 8)` constraint on `RegisterRequest`/`LoginRequest` — keeping
 * this in sync avoids a form that "passes" client-side but is rejected by
 * the server.
 *
 * @param {string} password the value to check
 * @returns {string|null} an error message, or null if valid
 */
export function validatePassword(password) {
  if (!password) {
    return 'Password is required'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  return null
}

/**
 * Generic required-field check, used for fields (e.g. name) that have no
 * other shape constraint beyond "must not be blank".
 *
 * @param {string} value the value to check
 * @param {string} fieldName human-readable field name used in the message
 * @returns {string|null} an error message, or null if valid
 */
export function validateRequired(value, fieldName) {
  if (!value || !value.trim()) {
    return `${fieldName} is required`
  }
  return null
}

// Deliberately loose — a full RFC 3986 URL parser would reject plenty of
// real, pasteable job-posting links (bare domains, unusual TLDs). This only
// checks for a scheme and a dot, which is enough to catch the common
// mistake (pasting a search query, or a domain with no scheme) without
// being a strict gate.
const URL_HINT_PATTERN = /^https?:\/\/.+\..+/i

/**
 * Soft, non-blocking check for whether a job posting URL "looks like" a
 * URL. Unlike `validateEmail`/`validatePassword`/`validateRequired`, this
 * is never wired to block submission — the backend's `ApplicationRequest`
 * DTO has no format constraint on `jobUrl` at all (see Task 4's design
 * note: job posting URLs are messy in the wild, and the field is purely
 * informational). This exists only to show an inline hint the user is free
 * to ignore and submit anyway.
 *
 * @param {string} url the value to check
 * @returns {string|null} a hint message, or null if it looks fine or is empty
 */
export function validateUrlHint(url) {
  if (!url || !url.trim()) {
    return null
  }
  if (!URL_HINT_PATTERN.test(url.trim())) {
    return "Doesn't look like a full URL (e.g. https://example.com/job) — you can still save it as-is."
  }
  return null
}
