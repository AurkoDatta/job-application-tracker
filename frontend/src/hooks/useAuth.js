import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

/**
 * Reads `{ user, loading, login, register, logout }` from `AuthContext`.
 * Throws if used outside an `AuthProvider` so a missing provider fails
 * loudly during development instead of silently returning `undefined`
 * fields to the caller.
 *
 * @returns {{user: object|null, loading: boolean, login: Function, register: Function, logout: Function}}
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
