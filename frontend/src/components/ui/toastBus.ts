/**
 * A module-level channel so code outside the React tree can raise a toast.
 *
 * The one caller that needs this is the React Query `MutationCache` in
 * `lib/query-client.ts`: it is constructed once at module scope, long before any
 * provider mounts, so it cannot use the `useToast()` hook. Everything inside the
 * tree should keep using `useToast()`.
 */

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastInput {
  message: string
  tone?: ToastTone
  /** e.g. { label: 'Undo', onClick } for reversible actions. */
  action?: ToastAction
  /** Milliseconds; errors and toasts with an action stay longer by default. */
  duration?: number
}

type Listener = (toast: ToastInput) => void

const listeners = new Set<Listener>()

export const subscribeToToasts = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * No-ops when nothing is listening, so a unit test that renders a component
 * without <ToastProvider> doesn't throw on a failed mutation.
 */
export const publishToast = (toast: ToastInput) => {
  for (const listener of listeners) listener(toast)
}
