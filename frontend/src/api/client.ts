import axios from 'axios'

export const TOKEN_KEY = 'credvault_token'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export function extractErrorMessage(err: unknown): string {
  const anyErr = err as any
  const detail = anyErr?.response?.data?.detail
  if (!detail) return "Noma'lum xatolik yuz berdi."
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg ?? JSON.stringify(d)).join(' | ')
  }
  return "Noma'lum xatolik yuz berdi."
}

export default api
