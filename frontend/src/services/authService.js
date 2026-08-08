import api from './api'

// Thin wrappers around the shared axios instance (see services/api.js) for
// every /api/auth/** endpoint. Kept intentionally free of React/context
// concerns — AuthContext owns state, this module only knows how to talk to
// the backend. Every response body already matches the AuthResponse shape
// ({ id, name, email }); the JWT itself never appears here since it travels
// exclusively via the httpOnly `token` cookie the backend sets.

/**
 * Registers a new account.
 *
 * @param {string} name the display name
 * @param {string} email the login email
 * @param {string} password the plaintext password (hashed server-side)
 * @returns {Promise<{id: string, name: string, email: string}>} the created user
 */
export function register(name, email, password) {
  return api.post('/auth/register', { name, email, password }).then((res) => res.data)
}

/**
 * Logs in with email/password.
 *
 * @param {string} email the login email
 * @param {string} password the plaintext password
 * @returns {Promise<{id: string, name: string, email: string}>} the authenticated user
 */
export function login(email, password) {
  return api.post('/auth/login', { email, password }).then((res) => res.data)
}

/**
 * Logs out the current session by asking the backend to clear the auth
 * cookie.
 *
 * @returns {Promise<void>}
 */
export function logout() {
  return api.post('/auth/logout').then(() => undefined)
}

/**
 * Fetches the currently authenticated user, if any. Used on mount to
 * restore session state after a page refresh, since the httpOnly JWT
 * cookie itself is invisible to JS — this is the only way the SPA can know
 * whether a valid session already exists.
 *
 * @returns {Promise<{id: string, name: string, email: string}>} the current user
 * @throws if there is no valid session (backend responds 401/403)
 */
export function getCurrentUser() {
  return api.get('/auth/me').then((res) => res.data)
}
