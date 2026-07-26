import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, ShieldAlert, Mail, Send, CheckCircle2, RefreshCw } from 'lucide-react'
import api, { extractErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Layout from '../components/Layout'

const GMAIL_RE = /^[a-zA-Z0-9._%+-]+@gmail\.com$/

function EmailForm() {
  const { currentUser, refreshMe } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState(currentUser?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValid = GMAIL_RE.test(email.trim())

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setError(null)
    setSaving(true)
    try {
      await api.put('/auth/email', { email: email.trim().toLowerCase() })
      await refreshMe()
      toast.show('Email manzil saqlandi.', 'success')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
      <div>
        <label className="label">Email manzil</label>
        <div className="relative">
          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            className="input pl-10"
            placeholder="ismingiz@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          "Parolni unutdim" funksiyasi shu email manziliga yuboriladi — to'g'ri va o'zingizga
          tegishli email kiriting.
        </p>
      </div>
      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}
      <button type="submit" disabled={!isValid || saving} className="btn-secondary">
        {saving ? 'Saqlanmoqda...' : 'Email manzilni saqlash'}
      </button>
    </form>
  )
}

function TelegramForm() {
  const { currentUser, refreshMe } = useAuth()
  const toast = useToast()
  const [botUsername, setBotUsername] = useState<string | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [candidate, setCandidate] = useState<{
    chat_id: string
    telegram_username?: string | null
    telegram_first_name?: string | null
    telegram_last_name?: string | null
  } | null>(null)

  const isLinked = Boolean(currentUser?.telegram_chat_id)

  useEffect(() => {
    api
      .get('/auth/telegram/bot-info')
      .then((res) => setBotUsername(res.data.bot_username || null))
      .catch(() => setBotUsername(null))
  }, [])

  const handleDetect = async () => {
    setError(null)
    setCandidate(null)
    setDetecting(true)
    try {
      const res = await api.get('/auth/telegram/detect')
      setCandidate(res.data)
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setDetecting(false)
    }
  }

  const handleLink = async () => {
    if (!candidate) return
    setLinking(true)
    setError(null)
    try {
      await api.put('/auth/telegram', {
        chat_id: candidate.chat_id,
        telegram_username: candidate.telegram_username,
        telegram_first_name: candidate.telegram_first_name,
      })
      await refreshMe()
      setCandidate(null)
      toast.show("Telegram hisobi muvaffaqiyatli bog'landi.", 'success')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLinking(false)
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div className="flex items-center gap-2">
        {isLinked ? (
          <span className="badge-admin">
            <CheckCircle2 size={12} />
            Bog'langan {currentUser?.telegram_username ? `(@${currentUser.telegram_username})` : ''}
          </span>
        ) : (
          <span className="badge-off">Bog'lanmagan</span>
        )}
      </div>

      <div className="text-xs text-slate-500 leading-relaxed bg-ink-800/60 border border-white/5 rounded-lg px-3.5 py-3 space-y-1">
        <p>
          1. Telegramda {botUsername ? <span className="text-brass-400">@{botUsername}</span> : 'botimizni'} toping va{' '}
          <span className="text-slate-300 font-mono">/start</span> bosing.
        </p>
        <p>2. Shu yerda "Aniqlash" tugmasini bosing va bog'lashni tasdiqlang.</p>
        <p>"Parolni unutdim" funksiyasi yangi vaqtinchalik parolni shu Telegram orqali yuboradi.</p>
      </div>

      {candidate && (
        <div className="flex items-center justify-between gap-3 bg-mint-500/10 border border-mint-500/25 rounded-lg px-3.5 py-3">
          <div className="text-sm text-mint-200">
            Topildi:{' '}
            <span className="font-medium">
              {candidate.telegram_first_name} {candidate.telegram_last_name}
            </span>
            {candidate.telegram_username && (
              <span className="text-mint-400"> (@{candidate.telegram_username})</span>
            )}
          </div>
          <button className="btn-primary !py-1.5 !px-3 text-xs" disabled={linking} onClick={handleLink}>
            {linking ? "Bog'lanmoqda..." : 'Tasdiqlash'}
          </button>
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      <button type="button" className="btn-secondary" disabled={detecting} onClick={handleDetect}>
        <RefreshCw size={15} className={detecting ? 'animate-spin' : ''} />
        {detecting ? 'Qidirilmoqda...' : isLinked ? "Qayta bog'lash / Aniqlash" : 'Aniqlash'}
      </button>
    </div>
  )
}

function PasswordForm({ forced, onDone }: { forced: boolean; onDone: () => void }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirmPassword) {
      setError("Yangi parol va tasdiqlash mos kelmadi.")
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      onDone()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="label">{forced ? 'Joriy (vaqtinchalik) parol' : 'Joriy parol'}</label>
        <input
          type="password"
          className="input"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label">Yangi parol</label>
        <input
          type="password"
          className="input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <p className="text-[11px] text-slate-500 mt-1.5">
          Kamida 8 belgi, 1 ta katta harf, 1 ta kichik harf va 1 ta raqam.
        </p>
      </div>
      <div>
        <label className="label">Yangi parolni tasdiqlang</label>
        <input
          type="password"
          className="input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>

      {error && (
        <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? 'Saqlanmoqda...' : 'Parolni saqlash'}
      </button>
    </form>
  )
}

export default function ChangePasswordPage() {
  const { mustChangePassword, setMustChangePassword, refreshMe, role } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const isSuperadmin = role === 'superadmin'

  const handleDone = async () => {
    toast.show('Parol muvaffaqiyatli yangilandi.', 'success')
    if (mustChangePassword) {
      setMustChangePassword(false)
      await refreshMe()
      navigate('/')
    } else {
      await refreshMe()
    }
  }

  if (mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-ink-950">
        <div className="card w-full max-w-md p-8">
          <div className="w-12 h-12 rounded-2xl bg-brass-500/15 border border-brass-500/30 flex items-center justify-center mb-5">
            <ShieldAlert size={22} className="text-brass-400" />
          </div>
          <h1 className="font-display text-xl font-semibold text-slate-100">
            Parolni o'zgartirish talab qilinadi
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 mb-6 leading-relaxed">
            Xavfsizlik maqsadida birinchi kirishda standart parolni yangi, shaxsiy parolga
            almashtirishingiz shart.
          </p>
          <PasswordForm forced onDone={handleDone} />

          {isSuperadmin && (
            <div className="mt-8 pt-6 border-t border-white/5 space-y-6">
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3">
                  Email manzilingizni ham kiriting
                </p>
                <EmailForm />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-1.5">
                  <Send size={14} className="text-brass-400" />
                  Telegram bilan bog'lang (parolni tiklash uchun)
                </p>
                <TelegramForm />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-brass-500/15 border border-brass-500/30 flex items-center justify-center">
          <KeyRound size={18} className="text-brass-400" />
        </div>
        <div>
          <h1 className="font-display text-xl font-semibold text-slate-100">Parolni o'zgartirish</h1>
          <p className="text-sm text-slate-500">O'z hisobingiz paroli{isSuperadmin ? ' va email manzili' : ''}</p>
        </div>
      </div>

      <div className="card p-6 max-w-md mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Parol</h2>
        <PasswordForm forced={false} onDone={handleDone} />
      </div>

      {isSuperadmin && (
        <div className="card p-6 max-w-md mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Email manzil</h2>
          <EmailForm />
        </div>
      )}

      {isSuperadmin && (
        <div className="card p-6 max-w-md">
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-1.5">
            <Send size={15} className="text-brass-400" />
            Telegram (parolni tiklash)
          </h2>
          <TelegramForm />
        </div>
      )}
    </Layout>
  )
}
