import { Button } from '@/components/ui/Button'
import { WarningIcon } from '@/components/icons'

interface ErrorStateProps {
  title?: string
  error: unknown
  onRetry?: () => void
}

export const errorMessage = (error: unknown, fallback = 'Something went wrong.') =>
  error instanceof Error ? error.message : fallback

export const ErrorState = ({ title = 'Could not load this view', error, onRetry }: ErrorStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 py-12 text-center">
    <WarningIcon className="mb-3 h-8 w-8 text-red-500" />
    <h3 className="text-base font-semibold text-red-900">{title}</h3>
    <p className="mt-1.5 max-w-md text-sm text-red-700">{errorMessage(error)}</p>
    {onRetry && (
      <Button variant="outline" className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
)
