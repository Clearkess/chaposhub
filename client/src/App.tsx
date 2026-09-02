import React, { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
import Landing from './pages/Landing'
import About from './pages/About'
import Help from './pages/Help'
import Contact from './pages/Contact'
import Legal from './pages/Legal'
import Dashboard from './pages/app/Dashboard'

type AuthMode = 'login' | 'register'

export default function App() {
  const { isAuthenticated, loading } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  function openSignIn() {
    setAuthMode('login')
    setAuthOpen(true)
  }

  function openSignUp() {
    setAuthMode('register')
    setAuthOpen(true)
  }

  function closeAuth() {
    setAuthOpen(false)
  }

  if (loading) {
    return (
      <div className="app-boot-loading" role="status" aria-live="polite">
        Loading…
      </div>
    )
  }

  // Authenticated users always see the dashboard app shell, regardless of path.
  if (isAuthenticated) {
    return <Dashboard />
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Landing onSignIn={openSignIn} onSignUp={openSignUp} />} />
        <Route path="/about" element={<About onSignIn={openSignIn} onSignUp={openSignUp} />} />
        <Route path="/help" element={<Help onSignIn={openSignIn} />} />
        <Route path="/contact" element={<Contact onSignIn={openSignIn} />} />
        <Route path="/privacy-policy" element={<Legal kind="privacy" onSignIn={openSignIn} />} />
        <Route path="/terms" element={<Legal kind="terms" onSignIn={openSignIn} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthModal open={authOpen} initialMode={authMode} onClose={closeAuth} />
    </>
  )
}
