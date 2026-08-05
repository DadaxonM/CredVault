import { useEffect, useState } from 'react'
import {
  KeyRound,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import Layout from '../components/Layout'
import Modal from '../components/Modal'
import api, { extractErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ServiceOut, UserOut } from '../types'

const emptyForm = { project_name: '', url_address: '', login: '', password: '' }

export default function ServicesPage() {
  const { role: myRole, userId } = useAuth()
  const toast = useToast()
  const canCreate = myRole === 'superadmin' || myRole === 'admin'
  const isSuperadmin = myRole === 'superadmin'

  const [services, setServices] = useState<ServiceOut[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editService, setEditService] = useState<ServiceOut | null>(null)
  const [accessService, setAccessService] = useState<ServiceOut | null>(null)

  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [revealed, setRevealed] = useState<Record<number, string>>({})
  const [visible, setVisible] = useState<Record<number, boolean>>({})
  const [revealing, setRevealing] = useState<Record<number, boolean>>({})

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get<ServiceOut[]>('/services')
      setServices(res.data)
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setFormError(null)
    setCreateOpen(true)
  }

  const openEdit = (s: ServiceOut) => {
    setEditService(s)
    setFormError(null)
    ensureRevealed(s.id).then((pwd) => {
      setForm({ project_name: s.project_name, url_address: s.url_address || '', login: s.login, password: pwd ?? '' })
    })
  }

  const handleCreate = async () => {
    setFormError(null)
    setSaving(true)
    try {
      await api.post('/services', form)
      toast.show('Xizmat yaratildi.', 'success')
      setCreateOpen(false)
      load()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editService) return
    setFormError(null)
    setSaving(true)
    try {
      await api.put(`/services/${editService.id}`, form)
      toast.show('Xizmat yangilandi.', 'success')
      setEditService(null)
      setRevealed((r) => ({ ...r, [editService.id]: form.password }))
      load()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: ServiceOut) => {
    if (!window.confirm(`"${s.project_name}" xizmatini o'chirmoqchimisiz?`)) return
    try {
      await api.delete(`/services/${s.id}`)
      toast.show("Xizmat o'chirildi.", 'success')
      load()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    }
  }

  const ensureRevealed = async (id: number): Promise<string | null> => {
    if (revealed[id]) return revealed[id]
    setRevealing((r) => ({ ...r, [id]: true }))
    try {
      const res = await api.post(`/services/${id}/reveal`)
      setRevealed((r) => ({ ...r, [id]: res.data.password }))
      return res.data.password as string
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
      return null
    } finally {
      setRevealing((r) => ({ ...r, [id]: false }))
    }
  }

  const toggleVisible = async (id: number) => {
    if (!visible[id]) {
      const pwd = await ensureRevealed(id)
      if (pwd === null) return
    }
    setVisible((v) => ({ ...v, [id]: !v[id] }))
  }

  const copyText = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    toast.show(`${label} nusxalandi.`, 'success')
  }

  const copyPassword = async (id: number) => {
    const pwd = await ensureRevealed(id)
    if (pwd) copyText(pwd, 'Parol')
  }

  const canEditDelete = (s: ServiceOut) => isSuperadmin || s.created_by_id === userId

  return (
    <Layout>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brass-500/15 border border-brass-500/30 flex items-center justify-center">
            <KeyRound size={18} className="text-brass-400" />
          </div>
          <div>
            <h1 className="font-display text-xl font-semibold text-slate-100">Xizmatlar (Services)</h1>
            <p className="text-sm text-slate-500">
              {isSuperadmin
                ? 'Barcha xizmatlar va ularning ko\'rish huquqlari'
                : "Sizga ko'rish huquqi berilgan xizmatlar"}
            </p>
          </div>
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Xizmat qo'shish
          </button>
        )}
      </div>

      {/* Desktop: jadval ko'rinishi */}
      <div className="card overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3.5 font-medium">Project name</th>
                <th className="px-5 py-3.5 font-medium">URL address</th>
                <th className="px-5 py-3.5 font-medium">Login</th>
                <th className="px-5 py-3.5 font-medium">Password</th>
                <th className="px-5 py-3.5 font-medium">Yaratuvchi</th>
                {isSuperadmin && <th className="px-5 py-3.5 font-medium">Ko'rish huquqi</th>}
                <th className="px-5 py-3.5 font-medium text-right">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    Yuklanmoqda...
                  </td>
                </tr>
              )}
              {!loading && services.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    {canCreate
                      ? "Hozircha xizmat yo'q. \"Xizmat qo'shish\" orqali birinchisini yarating."
                      : "Sizga hali hech qanday xizmat ko'rsatilmagan."}
                  </td>
                </tr>
              )}
              {services.map((s) => (
                <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-slate-200 font-medium">{s.project_name}</td>
                  <td className="px-5 py-3.5">
                    {s.url_address ? (
                      <a
                        href={s.url_address}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 underline decoration-sky-500/30 text-xs break-all"
                      >
                        {s.url_address}
                      </a>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-300">{s.login}</span>
                      <button
                        title="Loginni nusxalash"
                        className="btn-ghost !p-1.5"
                        onClick={() => copyText(s.login, 'Login')}
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-slate-300 min-w-[90px]">
                        {visible[s.id] ? revealed[s.id] : '••••••••'}
                      </span>
                      <button
                        title={visible[s.id] ? 'Yashirish' : "Ko'rsatish"}
                        className="btn-ghost !p-1.5"
                        onClick={() => toggleVisible(s.id)}
                        disabled={revealing[s.id]}
                      >
                        {visible[s.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        title="Parolni nusxalash"
                        className="btn-ghost !p-1.5"
                        onClick={() => copyPassword(s.id)}
                        disabled={revealing[s.id]}
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">{s.created_by_name}</td>
                  {isSuperadmin && (
                    <td className="px-5 py-3.5">
                      <AccessSummary service={s} />
                    </td>
                  )}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {isSuperadmin && (
                        <button
                          title="Ko'rish huquqini belgilash"
                          className="btn-ghost !p-2"
                          onClick={() => setAccessService(s)}
                        >
                          <Settings2 size={15} />
                        </button>
                      )}
                      {canEditDelete(s) && (
                        <>
                          <button title="Tahrirlash" className="btn-ghost !p-2" onClick={() => openEdit(s)}>
                            <Pencil size={15} />
                          </button>
                          <button
                            title="O'chirish"
                            className="btn-ghost !p-2 text-rose-400"
                            onClick={() => handleDelete(s)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobil / planshet: karta ko'rinishi */}
      <div className="lg:hidden">
        {loading && (
          <div className="card px-5 py-8 text-center text-slate-500">Yuklanmoqda...</div>
        )}
        {!loading && services.length === 0 && (
          <div className="card px-5 py-10 text-center text-slate-500">
            {canCreate
              ? "Hozircha xizmat yo'q. \"Xizmat qo'shish\" orqali birinchisini yarating."
              : "Sizga hali hech qanday xizmat ko'rsatilmagan."}
          </div>
        )}
        <div className="space-y-3">
          {services.map((s) => (
            <div key={s.id} className="card p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-slate-200 font-medium break-words">{s.project_name}</div>
                  {s.created_by_name && (
                    <div className="text-xs text-slate-500 mt-0.5">Yaratuvchi: {s.created_by_name}</div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isSuperadmin && (
                    <button
                      title="Ko'rish huquqini belgilash"
                      className="btn-ghost !p-2"
                      onClick={() => setAccessService(s)}
                    >
                      <Settings2 size={16} />
                    </button>
                  )}
                  {canEditDelete(s) && (
                    <>
                      <button title="Tahrirlash" className="btn-ghost !p-2" onClick={() => openEdit(s)}>
                        <Pencil size={16} />
                      </button>
                      <button
                        title="O'chirish"
                        className="btn-ghost !p-2 text-rose-400"
                        onClick={() => handleDelete(s)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {s.url_address && (
                <a
                  href={s.url_address}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 underline decoration-sky-500/30 text-xs break-all"
                >
                  {s.url_address}
                </a>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 shrink-0">Login</span>
                  <span className="font-mono text-slate-300 break-all flex-1 min-w-0">{s.login}</span>
                  <button
                    title="Loginni nusxalash"
                    className="btn-ghost !p-1.5 shrink-0"
                    onClick={() => copyText(s.login, 'Login')}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-20 shrink-0">Parol</span>
                  <span className="font-mono text-slate-300 break-all flex-1 min-w-0">
                    {visible[s.id] ? revealed[s.id] : '••••••••'}
                  </span>
                  <button
                    title={visible[s.id] ? 'Yashirish' : "Ko'rsatish"}
                    className="btn-ghost !p-1.5 shrink-0"
                    onClick={() => toggleVisible(s.id)}
                    disabled={revealing[s.id]}
                  >
                    {visible[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    title="Parolni nusxalash"
                    className="btn-ghost !p-1.5 shrink-0"
                    onClick={() => copyPassword(s.id)}
                    disabled={revealing[s.id]}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>

              {isSuperadmin && (
                <div className="pt-1 border-t border-white/5">
                  <p className="text-xs text-slate-500 mb-1.5">Ko'rish huquqi</p>
                  <AccessSummary service={s} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {createOpen && (
        <Modal title="Yangi xizmat qo'shish" subtitle="Project name + Login juftligi takrorlanmasligi kerak" onClose={() => setCreateOpen(false)}>
          <ServiceForm form={form} setForm={setForm} />
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

      {editService && (
        <Modal title="Xizmatni tahrirlash" subtitle={editService.project_name} onClose={() => setEditService(null)}>
          <ServiceForm form={form} setForm={setForm} />
          {formError && <ErrorBox message={formError} />}
          <div className="flex justify-end gap-2 mt-6">
            <button className="btn-secondary" onClick={() => setEditService(null)}>
              Bekor qilish
            </button>
            <button className="btn-primary" disabled={saving} onClick={handleUpdate}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </Modal>
      )}

      {accessService && (
        <AccessModal
          service={accessService}
          onClose={() => setAccessService(null)}
          onSaved={() => {
            setAccessService(null)
            load()
          }}
        />
      )}
    </Layout>
  )
}

function AccessSummary({ service }: { service: ServiceOut }) {
  if (service.access_grants.length === 0) {
    return <span className="text-xs text-slate-600">Faqat yaratuvchi va superadmin</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {service.access_grants.map((g) => (
        <span key={g.id} className="badge-user !normal-case">
          {g.role_name ? (g.role_name === 'admin' ? 'Barcha adminlar' : 'Barcha foydalanuvchilar') : g.user_full_name}
        </span>
      ))}
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3.5 py-2.5 mt-4">
      {message}
    </div>
  )
}

function ServiceForm({
  form,
  setForm,
}: {
  form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Project name</label>
        <input
          className="input"
          value={form.project_name}
          onChange={(e) => setForm({ ...form, project_name: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="label">URL address <span className="text-slate-600 normal-case">(ixtiyoriy)</span></label>
        <input
          className="input"
          placeholder="https://example.com"
          value={form.url_address}
          onChange={(e) => setForm({ ...form, url_address: e.target.value })}
        />
      </div>
      <div>
        <label className="label">Our login</label>
        <input
          className="input font-mono"
          value={form.login}
          onChange={(e) => setForm({ ...form, login: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="label">Our password</label>
        <input
          className="input font-mono"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
      </div>
    </div>
  )
}

function AccessModal({
  service,
  onClose,
  onSaved,
}: {
  service: ServiceOut
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [admins, setAdmins] = useState<UserOut[]>([])
  const [users, setUsers] = useState<UserOut[]>([])
  const [loadingLists, setLoadingLists] = useState(true)
  const [saving, setSaving] = useState(false)

  const [allAdmins, setAllAdmins] = useState(false)
  const [allUsers, setAllUsers] = useState(false)
  // Yagona manba: aniq shaxslarga berilgan ruxsatlar (adminlar ham, userlar ham shu bitta to'plamda).
  // Alohida ikkita to'plam ishlatilmaydi — aks holda checkbox o'chirilganda eski holat boshqa
  // to'plamda saqlanib qolib, ruxsatni bekor qilish ishlamay qolardi.
  const [selectedIndividualIds, setSelectedIndividualIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    Promise.all([api.get<UserOut[]>('/users', { params: { role: 'admin' } }), api.get<UserOut[]>('/users', { params: { role: 'user' } })])
      .then(([a, u]) => {
        setAdmins(a.data)
        setUsers(u.data)
      })
      .catch((err) => toast.show(extractErrorMessage(err), 'error'))
      .finally(() => setLoadingLists(false))

    setAllAdmins(service.access_grants.some((g) => g.role_name === 'admin'))
    setAllUsers(service.access_grants.some((g) => g.role_name === 'user'))
    setSelectedIndividualIds(
      new Set(service.access_grants.filter((g) => g.user_id != null).map((g) => g.user_id as number)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service.id])

  const toggleIndividual = (id: number) => {
    setSelectedIndividualIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const role_names: string[] = []
      if (allAdmins) role_names.push('admin')
      if (allUsers) role_names.push('user')
      const user_ids = [...selectedIndividualIds]
      await api.put(`/services/${service.id}/access`, { role_names, user_ids })
      toast.show("Ko'rish huquqlari yangilandi.", 'success')
      onSaved()
    } catch (err) {
      toast.show(extractErrorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Ko'rish huquqini belgilash"
      subtitle={`${service.project_name} — kim ko'ra oladi`}
      onClose={onClose}
      width="max-w-2xl"
    >
      {loadingLists ? (
        <p className="text-sm text-slate-500">Yuklanmoqda...</p>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start gap-2.5 text-xs text-slate-500 bg-ink-800/60 border border-white/5 rounded-lg px-3.5 py-3">
            <ShieldCheck size={15} className="text-brass-400 shrink-0 mt-0.5" />
            <p>
              Xizmatni yaratgan admin va superadmin har doim ko'ra oladi. Bu yerda qo'shimcha kim
              ko'rishi mumkinligini belgilaysiz — butun rolga yoki aniq shaxsga.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-300 mb-2.5">Rol bo'yicha</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" className="accent-brass-500" checked={allAdmins} onChange={(e) => setAllAdmins(e.target.checked)} />
                Barcha adminlar
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" className="accent-brass-500" checked={allUsers} onChange={(e) => setAllUsers(e.target.checked)} />
                Barcha foydalanuvchilar
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2.5">Aniq adminlar</p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {admins.length === 0 && <p className="text-xs text-slate-600">Admin mavjud emas</p>}
                {admins.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-brass-500"
                      checked={selectedIndividualIds.has(a.id)}
                      onChange={() => toggleIndividual(a.id)}
                    />
                    {a.last_name} {a.first_name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2.5">Aniq foydalanuvchilar</p>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {users.length === 0 && <p className="text-xs text-slate-600">Foydalanuvchi mavjud emas</p>}
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      className="accent-brass-500"
                      checked={selectedIndividualIds.has(u.id)}
                      onChange={() => toggleIndividual(u.id)}
                    />
                    {u.last_name} {u.first_name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <button className="btn-secondary" onClick={onClose}>
          Bekor qilish
        </button>
        <button className="btn-primary" disabled={saving || loadingLists} onClick={handleSave}>
          {saving ? 'Saqlanmoqda...' : 'Saqlash'}
        </button>
      </div>
    </Modal>
  )
}
