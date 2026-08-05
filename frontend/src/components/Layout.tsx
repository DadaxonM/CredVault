import { ReactNode, useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, Users, KeyRound, LogOut, Lock, TimerReset, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useIdleTimer } from '../context/IdleTimerContext'
import { RoleName } from '../types'

const roleLabel: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  user: 'Foydalanuvchi',
}

const roleBadgeClass: Record<string, string> = {
  superadmin: 'badge-superadmin',
  admin: 'badge-admin',
  user: 'badge-user',
}

export default function Layout({ children }: { children: ReactNode }) {
  const { role, fullName, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Marshrut o'zgarganda (mobil menyuda havola bosilganda) drawer yopiladi.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  // Drawer ochiq bo'lganda body scroll bloklanadi va Escape bilan yopiladi.
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobil / planshet uchun yuqori panel (hamburger) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-white/5 bg-ink-900/85 backdrop-blur px-4 min-h-[3.5rem] pt-[env(safe-area-inset-top)]">
        <button
          onClick={() => setDrawerOpen(true)}
          className="btn-ghost !p-2 -ml-2"
          aria-label="Menyuni ochish"
          aria-expanded={drawerOpen}
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brass-500/15 border border-brass-500/30 flex items-center justify-center">
            <ShieldCheck size={16} className="text-brass-400" />
          </div>
          <span className="font-display font-semibold text-slate-100">CredVault</span>
        </div>
      </header>

      {/* Desktop uchun statik yon panel */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-white/5 bg-ink-900/60 flex-col p-5 gap-6">
        <SidebarContent role={role} fullName={fullName} onLogout={handleLogout} />
      </aside>

      {/* Mobil / planshet uchun ochiladigan drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-[85%] bg-ink-900 border-r border-white/10 flex flex-col p-5 gap-6 shadow-vault transition-transform duration-200 ease-out pt-[max(1.25rem,env(safe-area-inset-top))] ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setDrawerOpen(false)}
            className="btn-ghost !p-2 absolute top-3 right-3"
            aria-label="Menyuni yopish"
          >
            <X size={18} />
          </button>
          <SidebarContent role={role} fullName={fullName} onLogout={handleLogout} />
        </aside>
      </div>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-10 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </main>
    </div>
  )
}

function SidebarContent({
  role,
  fullName,
  onLogout,
}: {
  role: RoleName | null
  fullName: string | null
  onLogout: () => void
}) {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brass-500/12 text-brass-400 border border-brass-500/25'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
    }`

  return (
    <>
      <div className="flex items-center gap-2.5 px-1">
        <div className="w-9 h-9 rounded-xl bg-brass-500/15 border border-brass-500/30 flex items-center justify-center">
          <ShieldCheck size={18} className="text-brass-400" />
        </div>
        <div>
          <p className="font-display font-semibold text-slate-100 leading-tight">CredVault</p>
          <p className="text-[11px] text-slate-500 leading-tight">Kirish huquqlari</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5">
        {(role === 'superadmin' || role === 'admin') && (
          <NavLink to="/users" className={navItemClass}>
            <Users size={17} />
            Foydalanuvchilar
          </NavLink>
        )}
        <NavLink to="/services" className={navItemClass}>
          <KeyRound size={17} />
          Xizmatlar (Services)
        </NavLink>
        <NavLink to="/change-password" className={navItemClass}>
          <Lock size={17} />
          Parolni o'zgartirish
        </NavLink>
      </nav>

      <IdleCountdown />

      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="px-1 mb-3">
          <p className="text-sm font-medium text-slate-200 truncate">{fullName}</p>
          {role && <span className={roleBadgeClass[role]}>{roleLabel[role]}</span>}
        </div>
        <button onClick={onLogout} className="btn-ghost w-full justify-start text-rose-400 hover:bg-rose-500/10">
          <LogOut size={16} />
          Chiqish
        </button>
      </div>
    </>
  )
}

function IdleCountdown() {
  const { idleSecondsLeft, idleTimeoutSeconds } = useIdleTimer()
  const pct = Math.max(0, Math.min(100, (idleSecondsLeft / idleTimeoutSeconds) * 100))
  const urgent = idleSecondsLeft <= 10

  return (
    <div
      className={`rounded-xl border px-3.5 py-3 transition-colors ${
        urgent ? 'border-rose-500/30 bg-rose-500/10' : 'border-white/5 bg-ink-800/60'
      }`}
      title="Xavfsizlik uchun harakatsizlikda avtomatik chiqish"
    >
      <div className="flex items-center gap-2 mb-2">
        <TimerReset size={14} className={urgent ? 'text-rose-400' : 'text-slate-500'} />
        <span className={`text-xs font-medium ${urgent ? 'text-rose-300' : 'text-slate-400'}`}>
          Avtomatik chiqish
        </span>
        <span className={`ml-auto font-mono text-xs font-semibold ${urgent ? 'text-rose-300' : 'text-slate-300'}`}>
          {idleSecondsLeft}s
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            urgent ? 'bg-rose-500' : 'bg-brass-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
