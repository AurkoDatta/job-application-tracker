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

// NOTE: no 401-response interceptor yet — that needs AuthContext (Task 7)
// to redirect meaningfully on auth failure. Adding one now with nowhere
// good to route to would be worse than none.

export default api
