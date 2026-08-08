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
