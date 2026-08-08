import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { validateEmail, validatePassword } from '../utils/validators.js'

/**
 * Login page: email/password form wired to `AuthContext.login`.
 *
 * Client-side validation (via utils/validators.js) runs before any network
 * request fires, so an obviously-invalid submission (bad email shape, too
 * short a password) never reaches the backend. Backend errors — e.g. wrong
 * credentials — surface via the `{ message, status, timestamp }` shape
 * from GlobalExceptionHandler.
 */
function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const errors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setFieldErrors(errors)
    return Object.values(errors).every((err) => err === null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    // Guard clause: bail out before touching the network at all if
    // client-side validation fails.
    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/board', { replace: true })
    } catch (err) {
      const message = err.response?.data?.message ?? 'Login failed. Please try again.'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-mono text-2xl font-semibold uppercase tracking-widest text-stamp">
          Login
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded border border-slate/30 bg-card p-6">
          <div>
            <label htmlFor="email" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-slate/40 bg-paper px-3 py-2 text-sm text-ink focus:border-stamp focus:outline-none"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-rust">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-slate/40 bg-paper px-3 py-2 text-sm text-ink focus:border-stamp focus:outline-none"
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-rust">{fieldErrors.password}</p>}
          </div>

          {formError && <p className="text-sm text-rust">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-stamp py-2 font-mono text-xs uppercase tracking-wide text-paper hover:bg-stampLight disabled:opacity-60"
          >
            {submitting ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate">
          No account?{' '}
          <Link to="/register" className="text-stamp hover:text-stampLight">
            Register
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Login
