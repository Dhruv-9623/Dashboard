import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface HeatCell {
  /** `2025-03` */
  period: string
  value: number
}

interface HeatGridProps {
  cells: HeatCell[]
  /** Describes a cell in the tooltip, e.g. `2 deals`. */
  describe: (value: number) => string
  className?: string
}

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Activity as a year × month grid — where the busy stretches and the quiet ones
 * are, at a glance.
 *
 * A calendar grid rather than another bar chart: it answers "when were we
 * active" positionally, so a two-year gap is a visible block of empty cells
 * rather than a flat stretch of line that the eye slides over.
 *
 * Colour is a validated sequential ramp (one hue, light→dark) with an explicit
 * "none" step, and every cell carries its value in the title and the table twin,
 * so intensity is never the only way to read it.
 */
export const HeatGrid = ({ cells, describe, className }: HeatGridProps) => {
  const [hovered, setHovered] = useState<string | null>(null)

  if (cells.length === 0) return null

  const byPeriod = new Map(cells.map((cell) => [cell.period, cell.value]))
  const years = [...new Set(cells.map((cell) => Number(cell.period.slice(0, 4))))].sort()
  const max = Math.max(...cells.map((cell) => cell.value), 1)

  /** Five steps, so a single deal is still clearly "something". */
  const stepFor = (value: number) => {
    if (value <= 0) return 0
    return Math.min(Math.ceil((value / max) * 5), 5)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <div className="w-8 shrink-0" />
        <div className="grid flex-1 grid-cols-12 gap-1">
          {MONTHS.map((month, index) => (
            <span key={index} className="text-center text-[10px] text-ink-muted">
              {month}
            </span>
          ))}
        </div>
      </div>

      {years.map((year) => (
        <div key={year} className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-right text-[11px] tabular text-ink-muted">
            {String(year).slice(2)}
          </span>
          <div className="grid flex-1 grid-cols-12 gap-1">
            {MONTHS.map((_, index) => {
              const period = `${year}-${String(index + 1).padStart(2, '0')}`
              const value = byPeriod.get(period) ?? 0
              const step = stepFor(value)
              const label = `${MONTH_NAMES[index]} ${year}: ${describe(value)}`

              return (
                <div
                  key={period}
                  // A 24px row with the gap included clears the minimum hit area
                  // without making the grid gigantic.
                  className={cn(
                    'h-6 rounded transition-transform duration-150',
                    step === 0 && 'bg-surface-sunken ring-1 ring-inset ring-line',
                    hovered === period && 'scale-110 ring-2 ring-brand ring-offset-1 ring-offset-surface'
                  )}
                  style={step > 0 ? { background: `var(--seq-${step})` } : undefined}
                  title={label}
                  onMouseEnter={() => setHovered(period)}
                  onMouseLeave={() => setHovered(null)}
                />
              )
            })}
          </div>
        </div>
      ))}

      {/* Scale legend: a sequential ramp needs one, or the shades mean nothing. */}
      <div className="flex items-center justify-end gap-1.5 pt-1">
        <span className="text-[10px] text-ink-muted">Less</span>
        <span className="size-3 rounded-sm bg-surface-sunken ring-1 ring-inset ring-line" />
        {[1, 2, 3, 4, 5].map((step) => (
          <span key={step} className="size-3 rounded-sm" style={{ background: `var(--seq-${step})` }} />
        ))}
        <span className="text-[10px] text-ink-muted">More</span>
      </div>
    </div>
  )
}
