import { createContext, useCallback, useContext, useState, ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastState {
  show: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastState | undefined>(undefined)

let idCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    const id = ++idCounter
    setToasts((prev) => [...prev, { id, kind, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed z-[100] flex flex-col gap-2 bottom-4 right-4 left-4 w-auto sm:left-auto sm:bottom-5 sm:right-5 sm:w-80 pb-[env(safe-area-inset-bottom)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`card px-4 py-3 text-sm font-medium shadow-vault animate-[fadeIn_0.15s_ease-out] border-l-4 ${
              t.kind === 'success'
                ? 'border-l-mint-500 text-mint-300'
                : t.kind === 'error'
                ? 'border-l-rose-500 text-rose-300'
                : 'border-l-brass-500 text-brass-300'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast ToastProvider ichida ishlatilishi kerak')
  return ctx
}
