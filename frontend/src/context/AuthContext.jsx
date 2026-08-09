import { createContext, useEffect, useState } from 'react'
import * as authService from '../services/authService'
import { onUnauthorized } from '../services/api'

/**
 * Holds the authenticated user (or null) plus the initial-session-check
 * loading flag. Consumed via the `useAuth` hook rather than directly, so a
 * missing provider fails loudly instead of returning `undefined` silently.
 */
// This non-component export is intentional: `useAuth.js` is the sole
// consumer, and splitting the context object into its own file just to
// satisfy the fast-refresh heuristic would scatter one cohesive concern
// (auth state + its provider) across two files for no real benefit.
// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

/**
 * Provides authentication state and actions to the app.
 *
 * On mount, calls `GET /api/auth/me` to determine whether a valid session
 * already exists. This is necessary — and is the entire reason this
 * component exists — because the JWT lives in an httpOnly cookie that
 * client-side JS can never read: there is no localStorage token to check
 * synchronously, so "am I logged in?" can only be answered by asking the
 * server. Until that check resolves, `loading` is true so consumers (e.g.
 * ProtectedRoute) can avoid flashing a logged-out UI before the real answer
 * is known.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Registers with api.js's response interceptor (see that file's "401
  // handling" comment for why this is a registration callback rather than
  // an import in either direction) so a 401 on any authenticated request —
  // most commonly the 24h JWT cookie expiring while the SPA is still open —
  // clears `user` here. That alone is enough to redirect: every protected
  // route is wrapped in `ProtectedRoute`, which renders `<Navigate
  // to="/login">` the moment `user` is null, so there's nothing further to
  // do here beyond clearing state. Unregistered on unmount for symmetry,
  // though in practice `AuthProvider` lives for the app's whole lifetime.
  useEffect(() => {
    onUnauthorized(() => setUser(null))
    return () => onUnauthorized(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser)
      })
      .catch(() => {
        // No valid session (401/403) — not logged in, which is a normal
        // outcome here, not an error to surface.
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Logs in and updates auth state on success. Errors are intentionally
   * not swallowed here — they propagate to the caller (the Login page) so
   * the form can display the backend's error message.
   */
  async function login(email, password) {
    const currentUser = await authService.login(email, password)
    setUser(currentUser)
    return currentUser
  }

  /**
   * Registers and updates auth state on success, same error-propagation
   * contract as `login`.
   */
  async function register(name, email, password) {
    const currentUser = await authService.register(name, email, password)
    setUser(currentUser)
    return currentUser
  }

  /**
   * Logs out. Clears local `user` state unconditionally, even if the
   * network call fails — the user's intent is "log me out", and silently
   * remaining logged-in client-side because of a network blip is a worse
   * failure mode than an occasionally-redundant logout request.
   */
  async function logout() {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
