import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { queryClient } from './query-client'
import { ApiError } from './api-client'
import { subscribeToToasts } from '@/components/ui/toastBus'
import type { ToastInput } from '@/components/ui/toastBus'

/**
 * The point of these: before the MutationCache handler existed, 19 of the 20 files
 * with mutations had no onError at all, so a rejected action did nothing visible and
 * the user just clicked again. The floor has to hold for mutations nobody wired up.
 */
const captureToasts = () => {
  const seen: ToastInput[] = []
  const unsubscribe = subscribeToToasts((toast) => seen.push(toast))
  return { seen, unsubscribe }
}

const run = async (options: Record<string, unknown>) => {
  const mutation = queryClient.getMutationCache().build(queryClient as QueryClient, options)
  await mutation.execute(undefined).catch(() => {})
}

afterEach(() => vi.restoreAllMocks())

describe('global mutation error reporting', () => {
  it('reports a failure for a mutation that wired up no error handling of its own', async () => {
    const { seen, unsubscribe } = captureToasts()
    await run({
      mutationFn: () => Promise.reject(new ApiError('POOL_ENTRY_CONFLICT', 'Already in your pool.', 409)),
    })
    unsubscribe()

    expect(seen).toHaveLength(1)
    expect(seen[0]).toMatchObject({ message: 'Already in your pool.', tone: 'error' })
  })

  it('stays quiet when the call site renders the failure itself', async () => {
    const { seen, unsubscribe } = captureToasts()
    await run({
      meta: { errorToast: false },
      mutationFn: () => Promise.reject(new ApiError('VALIDATION_ERROR', 'Target amount is required.', 400)),
    })
    unsubscribe()

    expect(seen).toHaveLength(0)
  })

  it('never puts a 5xx server message on screen', async () => {
    const { seen, unsubscribe } = captureToasts()
    await run({
      mutationFn: () =>
        Promise.reject(new ApiError('INTERNAL_ERROR', 'constraint [uq_commitment_cycle_firm]', 500)),
    })
    unsubscribe()

    expect(seen[0].message).toBe('Something went wrong on our end. Please try again.')
  })

  it('does not fire on success', async () => {
    const { seen, unsubscribe } = captureToasts()
    await run({ mutationFn: () => Promise.resolve('ok') })
    unsubscribe()

    expect(seen).toHaveLength(0)
  })

  it('a call site onError still runs alongside the global one', async () => {
    const onError = vi.fn()
    const { seen, unsubscribe } = captureToasts()
    await run({ onError, mutationFn: () => Promise.reject(new ApiError('X', 'Nope.', 400)) })
    unsubscribe()

    expect(onError).toHaveBeenCalledOnce()
    expect(seen).toHaveLength(1)
  })
})
