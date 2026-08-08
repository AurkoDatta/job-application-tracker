import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

/**
 * Top navigation bar: app wordmark plus, only once a session exists,
 * links to the authenticated pages and a logout button. Deliberately
 * restrained — no mobile hamburger menu or elaborate chrome — consistent
 * with the utility-app design direction established in Task 6.
 */
function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="flex items-center justify-between border-b border-slate/20 bg-card px-6 py-4">
      <Link
        to={user ? '/board' : '/login'}
        className="font-mono text-sm font-semibold uppercase tracking-widest text-stamp"
      >
        Job Tracker
      </Link>

      {user && (
        <div className="flex items-center gap-6">
          <Link to="/board" className="font-mono text-xs uppercase tracking-wide text-ink hover:text-stamp">
            Board
          </Link>
          <Link to="/stats" className="font-mono text-xs uppercase tracking-wide text-ink hover:text-stamp">
            Stats
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="font-mono text-xs uppercase tracking-wide text-rust hover:text-rust/80"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  )
}

export default Navbar
