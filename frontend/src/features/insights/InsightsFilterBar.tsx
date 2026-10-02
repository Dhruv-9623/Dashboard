import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { RangeFilter } from '@/components/charts/RangeFilter'
import { FilterIcon, XIcon } from '@/components/icons'
import { InvestmentStatus, investmentStatusLabels, roundLabels } from '@/features/investments/types'
import type { InsightsFilters } from './useInsightsFilters'

interface InsightsFilterBarProps {
  filters: InsightsFilters
  setFilter: <K extends keyof InsightsFilters>(key: K, value: InsightsFilters[K]) => void
  clear: () => void
  activeCount: number
  /** Sectors actually present in the data — not every sector the platform knows. */
  sectors: string[]
  rounds: string[]
}

/**
 * One filter row above everything it scopes.
 *
 * Deliberately not per-card controls: with a range on each chart, two plots on
 * the same screen can silently be showing different slices, and every comparison
 * a reader makes between them is then wrong.
 *
 * The options are built from the data in hand rather than from the platform's
 * full enum lists, so the page never offers a filter that would empty it.
 */
export const InsightsFilterBar = ({
  filters,
  setFilter,
  clear,
  activeCount,
  sectors,
  rounds,
}: InsightsFilterBarProps) => (
  <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-card">
    <span className="flex items-center gap-1.5 pl-1 pr-1 text-ink-muted">
      <FilterIcon className="size-4" aria-hidden="true" />
      <span className="label-micro">Filter</span>
    </span>

    <RangeFilter value={filters.range} onChange={(value) => setFilter('range', value)} />

    <Select
      aria-label="Sector"
      className="h-9 w-auto min-w-[9rem] text-[13px]"
      value={filters.sector ?? ''}
      placeholder="All sectors"
      options={sectors.map((sector) => ({ value: sector, label: sector }))}
      onChange={(event) => setFilter('sector', event.target.value || null)}
    />

    <Select
      aria-label="Status"
      className="h-9 w-auto min-w-[8rem] text-[13px]"
      value={filters.status ?? ''}
      placeholder="Any status"
      options={Object.values(InvestmentStatus).map((status) => ({
        value: status,
        label: investmentStatusLabels[status],
      }))}
      onChange={(event) =>
        setFilter('status', (event.target.value || null) as InvestmentStatus | null)
      }
    />

    {rounds.length > 1 && (
      <Select
        aria-label="Round"
        className="h-9 w-auto min-w-[8rem] text-[13px]"
        value={filters.round ?? ''}
        placeholder="Any round"
        options={rounds.map((round) => ({
          value: round,
          label: roundLabels[round as keyof typeof roundLabels] ?? round,
        }))}
        onChange={(event) => setFilter('round', event.target.value || null)}
      />
    )}

    {activeCount > 0 && (
      <Button variant="ghost" size="sm" onClick={clear} className="ml-auto">
        <XIcon className="size-3.5" aria-hidden="true" />
        Clear {activeCount === 1 ? 'filter' : `${activeCount} filters`}
      </Button>
    )}
  </div>
)
