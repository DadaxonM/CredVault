import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ShieldCheck, Users, KeyRound, LogOut, Lock, TimerReset } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brass-500/12 text-brass-400 border border-brass-500/25'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
    }`

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-white/5 bg-ink-900/60 flex flex-col p-5 gap-6">
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
          <button onClick={handleLogout} className="btn-ghost w-full justify-start text-rose-400 hover:bg-rose-500/10">
            <LogOut size={16} />
            Chiqish
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10">{children}</div>
      </main>
    </div>
  )
}

function IdleCountdown() {
  const { idleSecondsLeft, idleTimeoutSeconds } = useAuth()
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
