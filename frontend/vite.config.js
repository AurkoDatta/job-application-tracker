import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /api requests to the Spring Boot backend during development.
      // This makes the Vite dev server and the backend appear same-origin
      // to the browser (both served from localhost:5173 from the browser's
      // point of view), which avoids SameSite/CORS complications with the
      // httpOnly JWT cookie the backend issues (see backend Task 2's auth
      // design) — cross-origin cookie handling is finicky, same-origin
      // sidesteps it entirely.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
