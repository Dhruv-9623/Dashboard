import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { duration, ease, motion, stagger } from '@/lib/motion'

interface RankedBarsProps {
  items: Array<{ label: string; value: number; share: number }>
  format: (value: number) => string
  /** Rows beyond this fold into an "Other" row rather than running down the page. */
  limit?: number
  className?: string
}

/**
 * Magnitude across named categories — sector exposure, stage spread — as a
 * ranked list of horizontal bars.
 *
 * A bar list rather than a donut: the values here are often close together, and
 * people compare lengths accurately and angles badly. It also survives phone
 * width and long sector names, which a pie's labels don't.
 *
 * Every bar is the same colour. These are nominal categories with no order of
 * their own, so hue would be decoration — the sort and the length already carry
 * the ranking.
 */
export const RankedBars = ({ items, format, limit = 6, className }: RankedBarsProps) => {
  const listRef = useRef<HTMLUListElement>(null)

  const visible = items.slice(0, limit)
  const rest = items.slice(limit)
  const rows =
    rest.length > 0
      ? [
          ...visible,
          {
            label: `Other (${rest.length})`,
            value: rest.reduce((sum, item) => sum + item.value, 0),
            share: rest.reduce((sum, item) => sum + item.share, 0),
          },
        ]
      : visible

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const bars = list.querySelectorAll<HTMLElement>('[data-bar]')
    if (bars.length === 0) return

    const animation = motion(Array.from(bars), {
      scaleX: [0, 1],
      duration: duration.settled,
      ease: ease.out,
      delay: stagger(40),
    })
    return () => {
      animation?.revert()
    }
  }, [items])

  if (rows.length === 0) return null

  return (
    <ul ref={listRef} className={cn('space-y-2.5', className)}>
      {rows.map((item) => (
        <li key={item.label} className="group/bar">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate text-ink-secondary">{item.label}</span>
            <span className="shrink-0 tabular font-medium text-ink">{format(item.value)}</span>
            <span className="w-9 shrink-0 text-right tabular text-xs text-ink-muted">
              {Math.round(item.share * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div
              data-bar
              className="h-full origin-left rounded-full bg-viz-1 transition-opacity group-hover/bar:opacity-80"
              style={{ width: `${Math.max(item.share * 100, 1.5)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
