import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// BrowserRouter wraps the whole app so pages/components can use react-router
// hooks. AuthProvider lives inside App.jsx (not here) so it can sit below
// BrowserRouter but still wrap the auth-aware route table that needs
// react-router hooks (useNavigate, Navigate) alongside useAuth.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
