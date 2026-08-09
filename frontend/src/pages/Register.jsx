import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { validateEmail, validatePassword, validateRequired } from '../utils/validators.js'
import ErrorBanner from '../components/common/ErrorBanner'

/**
 * Register page: name/email/password form wired to `AuthContext.register`.
 * Same client-side-validation-before-network-call and
 * backend-error-display pattern as Login.
 */
function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function validate() {
    const errors = {
      name: validateRequired(name, 'Name'),
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setFieldErrors(errors)
    return Object.values(errors).every((err) => err === null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError(null)

    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
      await register(name, email, password)
      navigate('/board', { replace: true })
    } catch (err) {
      const message = err.response?.data?.message ?? 'Registration failed. Please try again.'
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center font-mono text-2xl font-semibold uppercase tracking-widest text-stamp">
          Register
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded border border-slate/30 bg-card p-6">
          <div>
            <label htmlFor="name" className="mb-1 block font-mono text-xs uppercase tracking-wide text-slate">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-slate/40 bg-paper px-3 py-2 text-sm text-ink focus:border-stamp focus:outline-none"
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-rust">{fieldErrors.name}</p>}
          </div>

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

          {formError && <ErrorBanner message={formError} />}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-stamp py-2 font-mono text-xs uppercase tracking-wide text-paper hover:bg-stampLight disabled:opacity-60"
          >
            {submitting ? 'Registering…' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate">
          Already have an account?{' '}
          <Link to="/login" className="text-stamp hover:text-stampLight">
            Login
          </Link>
        </p>
      </div>
    </main>
  )
}

export default Register
