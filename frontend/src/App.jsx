import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Board from './pages/Board.jsx'
import Stats from './pages/Stats.jsx'

/**
 * Root route table. No ProtectedRoute wrapper yet (Task 7 adds auth gating
 * once AuthContext exists) — every route is reachable directly for now.
 * "/" redirects to "/login" as a placeholder entry point; Task 7 will make
 * this decision based on actual auth state.
 * The paper/ink wrapper below exercises the custom Tailwind color tokens
 * so they're verified compiled from this task onward.
 */
function App() {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/board" element={<Board />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </div>
  )
}

export default App
