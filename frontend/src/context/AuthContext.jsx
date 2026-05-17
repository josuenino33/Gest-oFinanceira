import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api from '../utils/api'

const AuthContext = createContext(null)

const INATIVIDADE_KEY = 'finance-last-active'
const INATIVIDADE_LIMITE = 15 * 60 * 1000 // 15 minutos em ms

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('finance-dashboard-token'))
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('finance-dashboard-user')
      return stored ? JSON.parse(stored) : null
    } catch {
      localStorage.removeItem('finance-dashboard-user')
      return null
    }
  })

  useEffect(() => {
    if (token) localStorage.setItem('finance-dashboard-token', token)
    else localStorage.removeItem('finance-dashboard-token')
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem('finance-dashboard-user', JSON.stringify(user))
    else localStorage.removeItem('finance-dashboard-user')
  }, [user])

  // Auto-logout após 5 min com o app fechado/em background
  useEffect(() => {
    if (!token) return

    // Ao carregar: verifica se ficou mais de 5 min fora
    const ultimaAtividade = localStorage.getItem(INATIVIDADE_KEY)
    if (ultimaAtividade && Date.now() - Number(ultimaAtividade) > INATIVIDADE_LIMITE) {
      setToken(null)
      setUser(null)
      localStorage.removeItem('finance-dashboard-token')
      localStorage.removeItem('finance-dashboard-refresh')
      localStorage.removeItem(INATIVIDADE_KEY)
      return
    }

    // Salva o timestamp quando o app vai para background ou é fechado
    const salvarSaida = () => {
      if (document.visibilityState === 'hidden') {
        localStorage.setItem(INATIVIDADE_KEY, String(Date.now()))
      } else {
        // Voltou: verifica se passou do limite
        const ts = localStorage.getItem(INATIVIDADE_KEY)
        if (ts && Date.now() - Number(ts) > INATIVIDADE_LIMITE) {
          setToken(null)
          setUser(null)
          localStorage.removeItem('finance-dashboard-token')
          localStorage.removeItem('finance-dashboard-refresh')
          localStorage.removeItem(INATIVIDADE_KEY)
        } else {
          localStorage.removeItem(INATIVIDADE_KEY)
        }
      }
    }

    document.addEventListener('visibilitychange', salvarSaida)
    window.addEventListener('pagehide', () => localStorage.setItem(INATIVIDADE_KEY, String(Date.now())))

    return () => {
      document.removeEventListener('visibilitychange', salvarSaida)
    }
  }, [token])

  const login = (accessToken, refreshToken, userData) => {
    localStorage.removeItem(INATIVIDADE_KEY)
    setToken(accessToken)
    setUser(userData)
    localStorage.setItem('finance-dashboard-refresh', refreshToken)
  }

  const logout = async () => {
    try { await api.post('/logout') } catch {}
    setToken(null)
    setUser(null)
    localStorage.removeItem('finance-dashboard-token')
    localStorage.removeItem('finance-dashboard-refresh')
    localStorage.removeItem(INATIVIDADE_KEY)
  }

  const value = useMemo(
    () => ({ token, user, login, logout, isAuthenticated: Boolean(token) }),
    [token, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
