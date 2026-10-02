import { cn } from '@/lib/utils'
import { ArrowDownRightIcon, ArrowUpRightIcon, FlatIcon } from '@/components/icons'

interface DeltaPillProps {
  /** The change, as a percentage. 4.2 renders "4.2%". */
  value: number | null | undefined
  /** What the change is measured against, e.g. "vs last quarter". */
  since?: string
  /** For metrics where a rise is bad (burn, time-to-close). */
  invert?: boolean
  className?: string
}

/**
 * A signed change, coloured by whether it's good news.
 *
 * Direction is carried by the arrow as well as the colour, so it survives
 * greyscale and colour blindness — and the sign is in the text for screen
 * readers, which get the full phrase ("up 4.2% vs last quarter").
 */
export const DeltaPill = ({ value, since, invert, className }: DeltaPillProps) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null

  // Under a tenth of a percent is noise; call it flat rather than implying precision.
  const flat = Math.abs(value) < 0.1
  const up = value > 0
  const good = invert ? !up : up

  const Icon = flat ? FlatIcon : up ? ArrowUpRightIcon : ArrowDownRightIcon
  const tone = flat
    ? 'bg-surface-sunken text-ink-muted'
    : good
      ? 'bg-positive-subtle text-positive'
      : 'bg-negative-subtle text-negative'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular',
        tone,
        className
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span aria-hidden="true">{flat ? 'flat' : `${Math.abs(value).toFixed(1)}%`}</span>
      <span className="sr-only">
        {flat ? 'unchanged' : `${up ? 'up' : 'down'} ${Math.abs(value).toFixed(1)} percent`}
        {since ? ` ${since}` : ''}
      </span>
    </span>
  )
}
