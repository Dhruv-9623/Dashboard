import { Button } from '@/components/ui/Button'
import { WarningIcon } from '@/components/icons'

interface ErrorStateProps {
  title?: string
  error: unknown
  onRetry?: () => void
}

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again."

export const errorMessage = (error: unknown, fallback = 'Something went wrong.') => {
  // Browsers report network failures as a bare "Failed to fetch" / "Load failed" TypeError.
  if (error instanceof TypeError && /fetch|load failed|network/i.test(error.message)) {
    return NETWORK_MESSAGE
  }
  return error instanceof Error && error.message ? error.message : fallback
}

export const ErrorState = ({ title = 'Could not load this view', error, onRetry }: ErrorStateProps) => (
  <div
    role="alert"
    className="flex flex-col items-center justify-center rounded-lg border border-[color-mix(in_oklab,var(--negative)_25%,transparent)] bg-negative-subtle px-6 py-12 text-center"
  >
    <WarningIcon className="mb-3 h-8 w-8 text-negative" aria-hidden="true" />
    <h3 className="text-base font-semibold text-negative">{title}</h3>
    <p className="mt-1.5 max-w-md text-sm text-negative">{errorMessage(error)}</p>
    {onRetry && (
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
)
