import { MutationCache, QueryClient } from '@tanstack/react-query'
import { publishToast } from '@/components/ui/toastBus'
import { errorMessage } from './errorMessage'

export const queryClient = new QueryClient({
  // Every mutation reports its own failure, so no action can fail in silence.
  //
  // Before this, 19 of the 20 files with mutations had no onError: dismissing a
  // suggestion, RSVPing, removing from the pool and the rest simply did nothing
  // when the server refused, and the obvious response to that is to click again.
  // Putting the floor here rather than in each call site means a new mutation is
  // covered the moment it is written.
  //
  // Opt out with `meta: { errorToast: false }` on mutations that render the failure
  // themselves — a form showing an inline <Alert> — so one failure is never
  // reported twice.
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.meta?.errorToast === false) return
      publishToast({ message: errorMessage(error), tone: 'error' })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: 1,
    },
  },
})
