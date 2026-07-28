import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldCheck, Lock, User, Eye, EyeOff, KeyRound, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api, { extractErrorMessage } from '../api/client'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'

const USERNAME_RE = /^[a-zA-Z0-9_.]{3,64}$/

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  useEffect(() => {
    if ((location.state as any)?.idleLogout) {
      toast.show(
        `Xavfsizlik uchun 60 soniya harakatsizlikdan so'ng tizimdan avtomatik chiqarildingiz.`,
        'info',
      )
      window.history.replaceState({}, document.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(username.trim().toLowerCase(), password)
      const from = (location.state as any)?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Branding panel */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 bg-ink-900 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, #D9A441 0, #D9A441 1px, transparent 1px, transparent 22px)',
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brass-500/15 border border-brass-500/30 flex items-center justify-center">
            <ShieldCheck size={20} className="text-brass-400" />
          </div>
          <span className="font-display text-xl font-semibold text-slate-100">CredVault</span>
        </div>

        <div className="relative">
          <div className="mb-8 flex items-center gap-3 text-brass-400/80">
            <div className="w-16 h-16 rounded-2xl border border-brass-500/30 bg-brass-500/10 flex items-center justify-center">
              <KeyRound size={28} />
            </div>
          </div>
          <h1 className="font-display text-4xl font-semibold text-slate-100 leading-tight max-w-md">
            Rollarga asoslangan kirish huquqlari
          </h1>
          <p className="text-slate-400 mt-4 max-w-sm leading-relaxed">
            Superadmin, admin va foydalanuvchilar uchun aniq chegaralangan vakolatlar.
          </p>
        </div>

        <div className="relative flex gap-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} CredVault</span>
          <span></span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-brass-500/15 border border-brass-500/30 flex items-center justify-center">
              <ShieldCheck size={18} className="text-brass-400" />
            </div>
            <span className="font-display text-lg font-semibold text-slate-100">CredVault</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-slate-100">Tizimga kirish</h2>
          <p className="text-slate-500 text-sm mt-1.5 mb-8">
            Login va parolingizni kiriting
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Login</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input pl-10"
                  placeholder="Foydalanuvchi nomi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">Parol</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Tekshirilmoqda...' : 'Kirish'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="text-sm text-slate-500 hover:text-brass-400 transition-colors mt-4 block mx-auto"
          >
            Parolni unutdim
          </button>

          <p className="text-xs text-slate-600 mt-8 leading-relaxed">
            Superadmin birinchi marta kirganda tizim parolni majburiy ravishda o'zgartirishni so'raydi.
          </p>
        </div>
      </div>

      {forgotOpen && <ForgotPasswordModal onClose={() => setForgotOpen(false)} />}
    </div>
  )
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const toast = useToast()

  const isValid = USERNAME_RE.test(username.trim())

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setError(null)
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { username: username.trim().toLowerCase() })
      setSuccess(true)
      toast.show('Vaqtinchalik parol Telegram orqali yuborildi.', 'success')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Parolni unutdim"
      subtitle="Faqat superadmin login (username)i qabul qilinadi"
      onClose={onClose}
    >
      {success ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-mint-500/10 border border-mint-500/25 rounded-lg px-4 py-3.5">
            <ShieldCheck size={18} className="text-mint-400 shrink-0 mt-0.5" />
            <p className="text-sm text-mint-200 leading-relaxed">
              Vaqtinchalik parol Telegram orqali bog'langan hisobingizga yuborildi.
              Tizimga shu parol bilan kirib, yangi parol o'rnatishingiz so'raladi.
            </p>
          </div>
          <button className="btn-primary w-full" onClick={onClose}>
            Tushunarli
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Superadmin login (username)</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                className="input pl-10"
                placeholder="superadmin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </div>
            {username.length > 0 && !isValid && (
              <p className="text-xs text-amber-400 mt-1.5">
                Login 3-64 belgi, faqat lotin harf/raqam/._ bo'lishi kerak.
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
              <Send size={12} />
              Vaqtinchalik parol Telegram bot orqali yuboriladi.
            </p>
          </div>

          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button type="submit" disabled={!isValid || loading} className="btn-primary w-full">
            {loading ? 'Yuborilmoqda...' : 'Yuborish'}
          </button>
        </form>
      )}
    </Modal>
  )
}
