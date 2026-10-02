import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from '@/components/ErrorState'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Rendered instead of the default error card. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Catches render-time errors so a single broken screen shows a recoverable message instead of
 * unmounting the whole app. Reset it by changing its `key` (AppShell keys it on the route).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No error-reporting service is wired up yet; keep the stack visible during development.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('Render error caught by ErrorBoundary', error, info.componentStack)
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <ErrorState
          title="This screen hit a problem"
          error={new Error('Something went wrong while showing this page. Reloading usually fixes it.')}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }
}
