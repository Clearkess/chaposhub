import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { APIError } from '../api/client'

// Ported from public/static/js/auth.js + the auth modal markup in
// src/lib/app-html.ts. Logo centered above "Welcome back" heading,
// SlipCraft-styled, per the earlier request to add branding here.
type Mode = 'login' | 'register'

export default function AuthModal({
  open,
  initialMode = 'login',
  onClose
}: {
  open: boolean
  initialMode?: Mode
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  React.useEffect(() => {
    if (open) {
      setMode(initialMode)
      setError('')
      setUsername('')
      setEmail('')
      setPassword('')
    }
  }, [open, initialMode])

  if (!open) return null

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all required fields.')
      return
    }
    if (mode === 'register' && (!username || username.length < 3)) {
      setError('Username must be at least 3 characters.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(username, email, password)
      }
      onClose()
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <div className="auth-modal-logo">
          <img src="/images/logo-mark.png" alt="Chapo'sHub logo" width={52} height={52} />
        </div>
        <h2>{mode === 'login' ? "👋 Welcome back" : "🚀 Join Chapo'sHub"}</h2>
        <p className="auth-sub">
          {mode === 'login'
            ? 'Log in to access your receipts, points & AI tools.'
            : 'Create an account and get 245 free points to start.'}
        </p>
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Sign Up
          </button>
        </div>
        <div className={`auth-error ${error ? 'show' : ''}`}>{error}</div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label>Username</label>
              <input
                type="text"
                placeholder="chapo_"
                maxLength={20}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-field" style={{ marginBottom: 0 }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading && <span className="spinner" />}
            {!loading && <span className="btn-label">{mode === 'login' ? 'Log In' : 'Create Account'}</span>}
          </button>
        </form>
        <div className="auth-switch">
          <span>{mode === 'login' ? "Don't have an account?" : 'Already have an account?'}</span>{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              switchMode(mode === 'login' ? 'register' : 'login')
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </a>
        </div>
      </div>
    </div>
  )
}
