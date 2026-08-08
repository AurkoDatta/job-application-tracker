import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

/**
 * Layout-route guard for authenticated-only pages. Meant to wrap protected
 * `<Route>` children in App.jsx via nesting, e.g.:
 * `<Route element={<ProtectedRoute />}><Route path="/board" .../></Route>`.
 *
 * While the initial `/api/auth/me` session check is in flight (`loading`),
 * renders nothing rather than guessing — redirecting to /login before that
 * check resolves would incorrectly boot an already-logged-in user on every
 * refresh. Once resolved: no user means redirect to /login; otherwise
 * render the matched child route via `Outlet`.
 */
function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
