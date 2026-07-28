import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import api, { TOKEN_KEY } from '../api/client'
import { RoleName, UserOut } from '../types'

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
  }, [])

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
