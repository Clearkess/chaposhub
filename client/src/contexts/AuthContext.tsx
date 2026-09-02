import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, APIError } from '../api/client'

export interface ChapoUser {
  id: string
  username: string
  email: string
  points: number
  country: string
  role: string
  isVerified?: boolean
  referralCode?: string | null
  [key: string]: any
}

interface AuthContextValue {
  user: ChapoUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ChapoUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    if (!api.isAuthenticated()) {
      setUser(null)
      return
    }
    try {
      const me = await api.getMe()
      setUser(me)
    } catch (e) {
      if (e instanceof APIError && e.status === 401) {
        setUser(null)
      }
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      await refreshUser()
      setLoading(false)
    })()
  }, [refreshUser])

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.login(email, password)
      setUser(data.user)
    },
    []
  )

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const data = await api.register(username, email, password)
      setUser(data.user)
    },
    []
  )

  const logout = useCallback(() => {
    api.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
