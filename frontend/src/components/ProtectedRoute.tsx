import { Navigate, useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { RoleName } from '../types'

export default function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode
  allow?: RoleName[]
}) {
  const { isAuthenticated, isLoading, role, mustChangePassword } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-950 text-slate-400">
        Yuklanmoqda...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (allow && role && !allow.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
