import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { TOKEN_KEY } from '../api/client'
import { RoleName, UserOut } from '../types'

const INACTIVITY_TIMEOUT_SECONDS = 60
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  role: RoleName | null
  userId: number | null
  fullName: string | null
  mustChangePassword: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshMe: () => Promise<void>
  setMustChangePassword: (v: boolean) => void
  currentUser: UserOut | null
  idleSecondsLeft: number
  idleTimeoutSeconds: number
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [role, setRole] = useState<RoleName | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null)
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(INACTIVITY_TIMEOUT_SECONDS)
  const lastActivityRef = useRef<number>(Date.now())
  const navigate = useNavigate()

  const refreshMe = useCallback(async () => {
    const res = await api.get<UserOut>('/auth/me')
    setCurrentUser(res.data)
    setRole(res.data.role.name)
    setUserId(res.data.id)
    setFullName(`${res.data.last_name} ${res.data.first_name}`)
    setMustChangePassword(res.data.must_change_password)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }
    refreshMe()
      .then(() => setIsAuthenticated(true))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
      })
      .finally(() => setIsLoading(false))
  }, [refreshMe])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password })
    localStorage.setItem(TOKEN_KEY, res.data.access_token)
    setIsAuthenticated(true)
    setRole(res.data.role)
    setUserId(res.data.user_id)
    setFullName(res.data.full_name)
    setMustChangePassword(res.data.must_change_password)
    await refreshMe()
  }, [refreshMe])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setIsAuthenticated(false)
    setRole(null)
    setUserId(null)
    setFullName(null)
    setCurrentUser(null)
    setIdleSecondsLeft(INACTIVITY_TIMEOUT_SECONDS)
  }, [])

  // Harakatsizlikni kuzatish: 60 soniya davomida hech qanday interaksiya bo'lmasa,
  // xavfsizlik maqsadida foydalanuvchini avtomatik tizimdan chiqaradi.
  useEffect(() => {
    if (!isAuthenticated) return

    lastActivityRef.current = Date.now()
    setIdleSecondsLeft(INACTIVITY_TIMEOUT_SECONDS)

    const registerActivity = () => {
      lastActivityRef.current = Date.now()
    }
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, registerActivity, { passive: true }))

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000)
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - elapsed)
      setIdleSecondsLeft(remaining)
      if (remaining <= 0) {
        logout()
        navigate('/login', { replace: true, state: { idleLogout: true } })
      }
    }, 1000)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, registerActivity))
      clearInterval(interval)
    }
  }, [isAuthenticated, logout, navigate])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        role,
        userId,
        fullName,
        mustChangePassword,
        login,
        logout,
        refreshMe,
        setMustChangePassword,
        currentUser,
        idleSecondsLeft,
        idleTimeoutSeconds: INACTIVITY_TIMEOUT_SECONDS,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak')
  return ctx
}
