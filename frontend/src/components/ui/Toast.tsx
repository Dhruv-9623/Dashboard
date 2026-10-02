import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { XIcon } from '@/components/icons'

type ToastTone = 'success' | 'error' | 'info'

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastInput {
  message: string
  tone?: ToastTone
  /** e.g. { label: 'Undo', onClick } for reversible actions. */
  action?: ToastAction
  /** Milliseconds; errors and toasts with an action stay longer by default. */
  duration?: number
}

interface Toast extends Required<Pick<ToastInput, 'message' | 'tone'>> {
  id: number
  action?: ToastAction
  duration: number
}

interface ToastApi {
  show: (toast: ToastInput) => void
  success: (message: string, action?: ToastAction) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const toneStyles: Record<ToastTone, string> = {
  success: 'border-[color-mix(in_oklab,var(--positive)_25%,transparent)] bg-surface text-ink [&_[data-dot]]:bg-positive',
  error: 'border-[color-mix(in_oklab,var(--negative)_25%,transparent)] bg-surface text-ink [&_[data-dot]]:bg-negative',
  info: 'border-line bg-surface text-ink [&_[data-dot]]:bg-brand',
}

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) => {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration)
    return () => window.clearTimeout(timer)
  }, [paused, toast.id, toast.duration, onDismiss])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full items-start gap-3 rounded-lg border px-4 py-3 shadow-lg motion-safe:animate-[toast-in_150ms_ease-out]',
        toneStyles[toast.tone]
      )}
    >
      <span data-dot aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full" />
      <p className="flex-1 text-sm">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick()
            onDismiss(toast.id)
          }}
          className="shrink-0 rounded px-1 text-sm font-semibold text-brand-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="-m-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-icon-muted hover:bg-surface-hover hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <XIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/** App-wide toasts. Wrap once near the root; call `useToast()` anywhere below. */
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((input: ToastInput) => {
    const tone = input.tone ?? 'info'
    const duration = input.duration ?? (tone === 'error' || input.action ? 8000 : 4000)
    const toast: Toast = { id: nextId.current++, message: input.message, tone, action: input.action, duration }
    // Keep the stack short: the newest three.
    setToasts((current) => [...current, toast].slice(-3))
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, action) => show({ message, tone: 'success', action }),
      error: (message) => show({ message, tone: 'error' }),
    }),
    [show]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:w-96"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastApi => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
