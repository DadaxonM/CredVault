import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const INACTIVITY_TIMEOUT_SECONDS = 60
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'] as const

interface IdleState {
  idleSecondsLeft: number
  idleTimeoutSeconds: number
}

const IdleContext = createContext<IdleState | undefined>(undefined)

/**
 * Bu provider ataylab AuthContext'dan AJRATILGAN.
 *
 * Sabab: idleSecondsLeft har soniyada yangilanadi. Agar bu qiymat AuthContext ichida
 * bo'lganida, AuthContext'ni ishlatuvchi BARCHA sahifalar (Foydalanuvchilar, Xizmatlar va h.k.)
 * har soniyada majburan qayta render bo'lar edi — bu esa modal ichida ma'lumot kiritishda
 * "qotish" (lag/freeze) hissini berardi, ayniqsa sekinroq serverlarda.
 *
 * Shu context faqat sidebar'dagi kichik countdown vidjetiga (useIdleTimer orqali) bog'langan,
 * shuning uchun soniya sayin faqat o'sha kichik qism yangilanadi, qolgan butun ilova esa
 * faqat haqiqiy harakatlarga (masalan input o'zgarishi) javoban render bo'ladi.
 */
export function IdleTimerProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(INACTIVITY_TIMEOUT_SECONDS)
  const lastActivityRef = useRef<number>(Date.now())

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
    <IdleContext.Provider value={{ idleSecondsLeft, idleTimeoutSeconds: INACTIVITY_TIMEOUT_SECONDS }}>
      {children}
    </IdleContext.Provider>
  )
}

export function useIdleTimer() {
  const ctx = useContext(IdleContext)
  if (!ctx) throw new Error('useIdleTimer IdleTimerProvider ichida ishlatilishi kerak')
  return ctx
}
