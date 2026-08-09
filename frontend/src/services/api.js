import axios from 'axios'

// baseURL '/api' relies on the Vite dev proxy (vite.config.js) in
// development and should be served from the same origin in production.
// withCredentials is required because the backend's JWT auth (Task 2) uses
// an httpOnly cookie — every request must carry it for the browser to send
// the cookie cross-request.
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

// --- 401 handling -----------------------------------------------------
//
// The backend (see SecurityConfig's AuthenticationEntryPoint) now returns a
// consistent 401 for any request with no/expired/invalid credentials. When
// that happens mid-session — most commonly the 24h JWT cookie expiring
// while the SPA is still open — every data-fetching hook just surfaces a
// generic error banner forever unless something also clears `AuthContext`'s
// `user` and routes back to /login.
//
// This module can't import AuthContext directly to do that itself:
// AuthContext -> authService -> api forms the natural dependency direction
// already, so importing the other way (api -> AuthContext) would be
// circular. Instead, api.js exposes `onUnauthorized`, a tiny single-slot
// registration function; AuthContext calls it once on mount to be notified
// without either module needing to know the other's internals. Clearing
// `user` is enough to trigger the redirect — every protected route is
// already wrapped in `ProtectedRoute`, which renders `<Navigate to="/login">`
// as soon as `user` is null — so this module doesn't need its own
// `useNavigate`/router awareness at all.
let unauthorizedHandler = null

/**
 * Registers the single callback to invoke when a non-`/auth/me` request
 * comes back 401. Intended to be called once, by `AuthContext`, on mount.
 *
 * @param {(() => void)|null} handler
 */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    // `/auth/me` is deliberately excluded: AuthContext's own mount-time
    // session check already treats its rejection as "not logged in" (a
    // normal, expected outcome for a first-time or logged-out visitor, not
    // an auth failure to react to) — routing that through this same handler
    // too would fire a redirect before the app has even finished mounting,
    // an awkward loop rather than a real fix.
    const isAuthMeRequest = error.config?.url === '/auth/me'
    if (status === 401 && !isAuthMeRequest) {
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)

export default api
