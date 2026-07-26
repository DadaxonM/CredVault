import { useEffect, useMemo, useState } from 'react'
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  Trash2,
  Ban,
  CheckCircle2,
  KeyRound,
  Copy,
} from 'lucide-react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api, { extractErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { RoleName, UserOut } from '../types'

const emptyForm = {
  first_name: '',
  last_name: '',
  father_name: '',
  username: '',
  email: '',
  phone: '',
  password: '',
}

export default function UsersPage() {
  const { role: myRole } = useAuth()
  const toast = useToast()
  const isSuperadmin = myRole === 'superadmin'

  const [tab, setTab] = useState<RoleName>('user')
  const [users, setUsers] = useState<UserOut[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserOut | null>(null)
  const [tempPassword, setTempPassword] = useState<{ user: UserOut; password: string } | null>(null)

  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const activeRole: RoleName = isSuperadmin ? tab : 'user'

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get<UserOut[]>('/users', { params: isSuperadmin ? { role: activeRole } : {} })
      setUsers(res.data)
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRole])

  const filteredUsers = useMemo(
    () => users.filter((u) => u.role.name === activeRole),
    [users, activeRole],
  )

  const openCreate = () => {
    setForm(emptyForm)
    setFormError(null)
    setCreateOpen(true)
  }

  const openEdit = (u: UserOut) => {
    setEditUser(u)
    setForm({
      first_name: u.first_name,
      last_name: u.last_name,
      father_name: u.father_name,
      username: u.username,
      email: u.email,
      phone: u.phone,
      password: '',
    })
    setFormError(null)
  }

  const handleCreate = async () => {
    setFormError(null)
    setSaving(true)
    try {
      await api.post('/users', {
        role: activeRole,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        father_name: form.father_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      })
      toast.show(
        activeRole === 'admin' ? 'Admin muvaffaqiyatli yaratildi.' : 'Foydalanuvchi muvaffaqiyatli yaratildi.',
        'success',
      )
      setCreateOpen(false)
      load()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editUser) return
    setFormError(null)
    setSaving(true)
    try {
      await api.put(`/users/${editUser.id}`, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        father_name: form.father_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      })
      toast.show("Ma'lumotlar yangilandi.", 'success')
      setEditUser(null)
      load()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (u: UserOut) => {
    const verb = u.is_active ? 'faolsizlantirmoqchimisiz (disable)' : 'qayta faollashtirmoqchimisiz'
    if (!window.confirm(`"${u.last_name} ${u.first_name}" hisobini ${verb}?`)) return
    try {
      await api.patch(`/users/${u.id}/toggle-active`)
      toast.show(u.is_active ? 'Hisob disable qilindi.' : 'Hisob faollashtirildi.', 'success')
      load()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  const handleDelete = async (u: UserOut) => {
    if (!window.confirm(`"${u.last_name} ${u.first_name}" hisobini butunlay o'chirmoqchimisiz? Bu amalni orqaga qaytarib bo'lmaydi.`))
      return
    try {
      await api.delete(`/users/${u.id}`)
      toast.show("Foydalanuvchi o'chirildi.", 'success')
      load()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  const handleResetPassword = async (u: UserOut) => {
    if (!window.confirm(`"${u.last_name} ${u.first_name}" uchun yangi vaqtinchalik parol yaratilsinmi?`)) return
    try {
      const res = await api.post(`/users/${u.id}/reset-password`)
      setTempPassword({ user: u, password: res.data.temp_password })
      load()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    toast.show(`${label} nusxalandi.`, 'success')
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brass-500/15 border border-brass-500/30 flex items-center justify-center">
            <UsersIcon size={18} className="text-brass-400" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-100">Foydalanuvchilar</h1>
            <p className="text-sm text-slate-500">
              {isSuperadmin ? 'Admin va foydalanuvchi hisoblarini boshqarish' : 'Foydalanuvchi hisoblarini boshqarish'}
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          {activeRole === 'admin' ? 'Admin qo\'shish' : 'Foydalanuvchi qo\'shish'}
        </button>
      </div>

      {isSuperadmin && (
        <div className="flex gap-1.5 mb-6 border border-white/5 rounded-xl p-1 w-fit bg-ink-900/60">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'admin' ? 'bg-brass-500/15 text-brass-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setTab('admin')}
          >
            Adminlar
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'user' ? 'bg-brass-500/15 text-brass-400' : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setTab('user')}
          >
            Foydalanuvchilar
          </button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5 font-medium">F.I.Sh</th>
                <th className="px-5 py-3.5 font-medium">Login</th>
                <th className="px-5 py-3.5 font-medium">Email</th>
                <th className="px-5 py-3.5 font-medium">Telefon</th>
                <th className="px-5 py-3.5 font-medium">Holat</th>
                <th className="px-5 py-3.5 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                    Yuklanmoqda...
                  </td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    Hozircha hech kim yo'q. "{activeRole === 'admin' ? "Admin qo'shish" : "Foydalanuvchi qo'shish"}" tugmasi orqali birinchisini yarating.
                  </td>
                </tr>
              )}
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <div className="text-slate-200 font-medium">
                      {u.last_name} {u.first_name}
                    </div>
                    <div className="text-xs text-slate-500">{u.father_name}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-slate-300">{u.username}</td>
                  <td className="px-5 py-3.5 text-slate-400">{u.email}</td>
                  <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{u.phone}</td>
                  <td className="px-5 py-3.5">
                    {u.is_active ? (
                      <span className="badge-admin">Faol</span>
                    ) : (
                      <span className="badge-off">Disabled</span>
                    )}
                    {u.must_change_password && (
                      <span className="ml-1.5 text-[10px] text-slate-500">· parol kutilmoqda</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button title="Tahrirlash" className="btn-ghost !p-2" onClick={() => openEdit(u)}>
                        <Pencil size={15} />
                      </button>
                      <button title="Parolni tiklash" className="btn-ghost !p-2" onClick={() => handleResetPassword(u)}>
                        <KeyRound size={15} />
                      </button>
                      <button
                        title={u.is_active ? 'Disable qilish' : 'Faollashtirish'}
                        className="btn-ghost !p-2"
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.is_active ? <Ban size={15} className="text-amber-400" /> : <CheckCircle2 size={15} className="text-mint-400" />}
                      </button>
                      <button title="O'chirish" className="btn-ghost !p-2 text-rose-400" onClick={() => handleDelete(u)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <Modal
          title={activeRole === 'admin' ? 'Yangi admin yaratish' : 'Yangi foydalanuvchi yaratish'}
          subtitle="Barcha maydonlar to'ldirilishi shart"
          onClose={() => setCreateOpen(false)}
        >
          <UserForm form={form} setForm={setForm} mode="create" />
          {formError && <ErrorBox message={formError} />}
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn-secondary" onClick={() => setCreateOpen(false)}>
              Bekor qilish
            </button>
            <button className="btn-primary" disabled={saving} onClick={handleCreate}>
              {saving ? 'Saqlanmoqda...' : 'Yaratish'}
            </button>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal title="Foydalanuvchini tahrirlash" subtitle={editUser.username} onClose={() => setEditUser(null)}>
          <UserForm form={form} setForm={setForm} mode="edit" />
          {formError && <ErrorBox message={formError} />}
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn-secondary" onClick={() => setEditUser(null)}>
              Bekor qilish
            </button>
            <button className="btn-primary" disabled={saving} onClick={handleUpdate}>
              {saving ? 'Saqlanmoqda...' : "Saqlash"}
            </button>
          </div>
        </Modal>
      )}

      {tempPassword && (
        <Modal title="Vaqtinchalik parol yaratildi" onClose={() => setTempPassword(null)}>
          <p className="text-sm text-slate-400 mb-4">
            <span className="text-slate-200 font-medium">
              {tempPassword.user.last_name} {tempPassword.user.first_name}
            </span>{' '}
            uchun yangi vaqtinchalik parol. Buni xavfsiz tarzda foydalanuvchiga yetkazing — u keyingi
            kirishda parolni almashtirishi shart bo'ladi.
          </p>
          <div className="flex items-center gap-2 bg-ink-800 border border-white/10 rounded-lg px-3.5 py-2.5">
            <code className="font-mono text-sm text-brass-400 flex-1 break-all">{tempPassword.password}</code>
            <button className="btn-ghost !p-2" onClick={() => copy(tempPassword.password, 'Parol')}>
              <Copy size={15} />
            </button>
          </div>
          <div className="flex justify-end mt-6">
            <button className="btn-primary" onClick={() => setTempPassword(null)}>
              Tushunarli
            </button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5 mt-4">
      {message}
    </div>
  )
}

function UserForm({
  form,
  setForm,
  mode,
}: {
  form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void
  mode: 'create' | 'edit'
}) {
  const set = (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Ismi</label>
          <input className="input" value={form.first_name} onChange={set('first_name')} required />
        </div>
        <div>
          <label className="label">Familiyasi</label>
          <input className="input" value={form.last_name} onChange={set('last_name')} required />
        </div>
      </div>
      <div>
        <label className="label">Otasining ismi</label>
        <input className="input" value={form.father_name} onChange={set('father_name')} required />
      </div>
      {mode === 'create' && (
        <div>
          <label className="label">Login (username)</label>
          <input className="input" value={form.username} onChange={set('username')} required />
        </div>
      )}
      <div>
        <label className="label">Email</label>
        <input
          className="input"
          placeholder="ism.familiya@gmail.com"
          value={form.email}
          onChange={set('email')}
          required
        />
      </div>
      <div>
        <label className="label">Telefon</label>
        <input
          className="input"
          placeholder="(+998) 90-123-45-67"
          value={form.phone}
          onChange={set('phone')}
          required
        />
      </div>
      {mode === 'create' && (
        <div>
          <label className="label">Boshlang'ich parol</label>
          <input
            className="input"
            type="text"
            placeholder="Kamida 8 belgi, katta/kichik harf, raqam"
            value={form.password}
            onChange={set('password')}
            required
          />
        </div>
      )}
    </div>
  )
}
