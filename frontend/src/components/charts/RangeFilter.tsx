import { cn } from '@/lib/utils'

export type RangeKey = '12m' | '24m' | 'all'

export const RANGE_OPTIONS: Array<{ value: RangeKey; label: string; months: number | null }> = [
  { value: '12m', label: '12 months', months: 12 },
  { value: '24m', label: '24 months', months: 24 },
  { value: 'all', label: 'All time', months: null },
]

interface RangeFilterProps {
  value: RangeKey
  onChange: (value: RangeKey) => void
  className?: string
}

/**
 * The time range for every chart on the page.
 *
 * One control above everything it scopes, rather than a selector per card: with
 * per-chart ranges two plots on the same screen can silently be showing
 * different periods, and every comparison between them is then wrong.
 */
export const RangeFilter = ({ value, onChange, className }: RangeFilterProps) => (
  <div
    role="radiogroup"
    aria-label="Time range"
    className={cn(
      'inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5 shadow-card',
      className
    )}
  >
    {RANGE_OPTIONS.map((option) => {
      const active = option.value === value
      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors max-sm:min-h-10',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
            active
              ? 'bg-brand-subtle text-brand-ink'
              : 'text-ink-secondary hover:bg-surface-hover hover:text-ink'
          )}
        >
          {option.label}
        </button>
      )
    })}
  </div>
)

/** Keeps only the records inside the selected window. */
export function withinRange<T>(
  items: T[],
  range: RangeKey,
  dateOf: (item: T) => string
): T[] {
  const months = RANGE_OPTIONS.find((option) => option.value === range)?.months
  if (!months) return items

  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const iso = cutoff.toISOString().slice(0, 10)
  return items.filter((item) => dateOf(item) >= iso)
}
