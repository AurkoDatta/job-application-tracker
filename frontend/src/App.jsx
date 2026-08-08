import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './hooks/useAuth.js'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Navbar from './components/Navbar.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Board from './pages/Board.jsx'
import Stats from './pages/Stats.jsx'

/**
 * Route table, aware of auth state via `useAuth` (must render inside
 * `AuthProvider`, hence split out from `App` below).
 *
 * "/" now resolves based on actual auth state (redirect to /board if
 * logged in, /login otherwise) rather than the unconditional /login
 * placeholder from Task 6. /login and /register redirect an
 * already-authenticated user to /board — hitting the auth forms while
 * already logged in is a common UX papercut, not a state a logged-in user
 * should be able to land in. /board and /stats are gated behind
 * `ProtectedRoute`.
 *
 * While the initial `/api/auth/me` session check is in flight, nothing
 * renders yet — deciding any of the above (including whether to show the
 * Navbar's authenticated links) before that check resolves would mean
 * guessing, and guessing wrong flashes the wrong UI for a moment on every
 * refresh.
 */
function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return null
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to={user ? '/board' : '/login'} replace />} />
        <Route path="/login" element={user ? <Navigate to="/board" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/board" replace /> : <Register />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/board" element={<Board />} />
          <Route path="/stats" element={<Stats />} />
        </Route>
      </Routes>
    </>
  )
}

/**
 * App root. Wraps the auth-aware route table in `AuthProvider` so every
 * page/component below can call `useAuth()`.
 * The paper/ink wrapper below exercises the custom Tailwind color tokens
 * so they're verified compiled from this task onward.
 */
function App() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </div>
  )
}

export default App
