import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { InvestmentDTO } from '@/features/investments/types'
import { InvestmentStatus } from '@/features/investments/types'
import type { RangeKey } from '@/components/charts/RangeFilter'
import { RANGE_OPTIONS } from '@/components/charts/RangeFilter'

export interface InsightsFilters {
  range: RangeKey
  sector: string | null
  status: InvestmentStatus | null
  round: string | null
}

const RANGES = new Set(RANGE_OPTIONS.map((option) => option.value))
const STATUSES = new Set(Object.values(InvestmentStatus) as string[])

/**
 * The filter state for the Insights page, held in the URL.
 *
 * In the URL rather than in component state for two reasons: a filtered view is
 * the thing someone wants to send to a partner ("look at our Fintech exposure
 * over 12 months"), and coming back to the page after clicking into a company
 * should land on the same slice rather than resetting to everything.
 */
export function useInsightsFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<InsightsFilters>(() => {
    const range = params.get('range')
    const status = params.get('status')
    return {
      range: range && RANGES.has(range as RangeKey) ? (range as RangeKey) : '24m',
      sector: params.get('sector'),
      status: status && STATUSES.has(status) ? (status as InvestmentStatus) : null,
      round: params.get('round'),
    }
  }, [params])

  const setFilter = useCallback(
    <K extends keyof InsightsFilters>(key: K, value: InsightsFilters[K]) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current)
          // The default range and "any" for the rest stay out of the URL, so a
          // clean view has a clean link.
          if (value === null || value === '' || (key === 'range' && value === '24m')) {
            next.delete(key)
          } else {
            next.set(key, String(value))
          }
          return next
        },
        { replace: true }
      )
    },
    [setParams]
  )

  const clear = useCallback(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const key of ['range', 'sector', 'status', 'round']) next.delete(key)
        return next
      },
      { replace: true }
    )
  }, [setParams])

  const activeCount =
    (filters.range !== '24m' ? 1 : 0) +
    (filters.sector ? 1 : 0) +
    (filters.status ? 1 : 0) +
    (filters.round ? 1 : 0)

  return { filters, setFilter, clear, activeCount }
}

/** Applies every filter except the range, which needs the date field. */
export function applyFilters(records: InvestmentDTO[], filters: InsightsFilters) {
  return records.filter((record) => {
    if (filters.sector && (record.startupSector ?? 'Unspecified') !== filters.sector) return false
    if (filters.status && record.status !== filters.status) return false
    if (filters.round && record.round !== filters.round) return false
    return true
  })
}
