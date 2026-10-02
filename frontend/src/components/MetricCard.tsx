import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sparkline } from '@/components/ui/Sparkline'
import { DeltaPill } from '@/components/ui/DeltaPill'
import { useCountUp } from '@/lib/useMotion'

interface MetricCardProps {
  label: string
  /** Pre-formatted display value. Use `count` instead when the figure is numeric. */
  value?: ReactNode
  /**
   * A numeric value to animate to, with the formatter used for every frame.
   * Preferred over `value` for money and counts — the figure counts up when it
   * changes, and shows the formatted result when it doesn't.
   */
  count?: { to: number; format: (value: number) => string }
  /** Percentage change, rendered as a pill beside the figure. */
  delta?: number | null
  deltaSince?: string
  /** Higher is worse for this metric (burn, days-to-close). */
  invertDelta?: boolean
  hint?: string
  trend?: number[]
  tone?: 'default' | 'notice' | 'negative'
  /** Marks the primary figure on the page: larger, and lit by the pointer. */
  emphasis?: boolean
  /** A top accent line, used to tie a card to a chart series (Monarch's pattern). */
  accent?: string
  action?: ReactNode
  className?: string
}

const tones = {
  default: 'text-ink',
  notice: 'text-notice',
  negative: 'text-negative',
} as const

/**
 * One figure, with the context needed to read it: what it measures, which way
 * it moved, and the shape of how it got there.
 *
 * Replaces the earlier StatTile, which showed a label and a number and left the
 * reader to guess whether 3 was good.
 */
export const MetricCard = ({
  label,
  value,
  count,
  delta,
  deltaSince,
  invertDelta,
  hint,
  trend,
  tone = 'default',
  emphasis,
  accent,
  action,
  className,
}: MetricCardProps) => {
  const figure = useCountUp(count?.to ?? 0, count?.format ?? String)

  return (
    <div
      className={cn(
        'group/metric relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-4 shadow-card',
        'transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-raised',
        emphasis && 'p-5',
        className
      )}
    >
      {accent && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: accent }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <p className="label-micro">{label}</p>
        {action}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {count ? (
          <p
            // The formatted value is rendered server-side of the animation too,
            // so the figure is correct before any script runs and for anyone
            // with reduced motion.
            ref={figure as React.RefObject<HTMLParagraphElement>}
            className={cn(
              'font-semibold tabular tracking-[-0.02em]',
              emphasis ? 'text-[28px] leading-8' : 'text-2xl leading-7',
              tones[tone]
            )}
          >
            {count.format(count.to)}
          </p>
        ) : (
          <p
            className={cn(
              'font-semibold tabular tracking-[-0.02em]',
              emphasis ? 'text-[28px] leading-8' : 'text-2xl leading-7',
              tones[tone]
            )}
          >
            {value}
          </p>
        )}
        <DeltaPill value={delta} since={deltaSince} invert={invertDelta} />
      </div>

      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}

      {trend && trend.length > 1 && (
        <div className="mt-3 -mb-1">
          <Sparkline
            values={trend}
            tone={tone === 'negative' ? 'negative' : 'brand'}
            className={emphasis ? 'h-12' : 'h-8'}
          />
        </div>
      )}
    </div>
  )
}
