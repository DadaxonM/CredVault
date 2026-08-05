import { ReactNode, useEffect, useRef } from 'react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  width?: string
}

export default function Modal({ title, subtitle, onClose, children, width = 'max-w-lg' }: ModalProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className={`relative card w-full ${width} my-4 sm:my-8 animate-[fadeIn_0.15s_ease-out]`}>
        <div className="flex items-start justify-between px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-slate-100">{title}</h2>
            {subtitle && <p className="text-sm text-slate-400 mt-1 break-words">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors rounded-lg p-1 -mt-1 -mr-1"
            aria-label="Yopish"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
