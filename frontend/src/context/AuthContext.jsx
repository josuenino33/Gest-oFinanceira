import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('finance-dashboard-token'))
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('finance-dashboard-user')
      return stored ? JSON.parse(stored) : null
    } catch (e) {
      console.error('Erro ao carregar usuário do localStorage:', e)
      localStorage.removeItem('finance-dashboard-user')
      return null
    }
  })

  useEffect(() => {
    if (token) {
      localStorage.setItem('finance-dashboard-token', token)
    } else {
      localStorage.removeItem('finance-dashboard-token')
    }
  }, [token])

  useEffect(() => {
    if (user) {
      localStorage.setItem('finance-dashboard-user', JSON.stringify(user))
    } else {
      localStorage.removeItem('finance-dashboard-user')
    }
  }, [user])

  const login = (newToken, userData) => {
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({ token, user, login, logout, isAuthenticated: Boolean(token) }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
