import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { duration, ease, motion, stagger } from '@/lib/motion'

interface Segment {
  label: string
  value: number
  /** The value as the reader should see it — "₹35.00 Cr", "62%". */
  formatted: string
  color: string
}

interface AllocationBarProps {
  title: string
  description?: string
  segments: Segment[]
  emptyMessage: string
  className?: string
}

/**
 * A single stacked bar plus a legend — the shape of a portfolio in one line.
 *
 * Preferred over a pie: a bar compares lengths, which people read accurately,
 * and it still works at phone width where a pie's labels collide.
 *
 * The segments grow from zero on first paint, staggered left to right, so the
 * composition builds rather than appearing.
 */
export const AllocationBar = ({
  title,
  description,
  segments,
  emptyMessage,
  className,
}: AllocationBarProps) => {
  const barRef = useRef<HTMLDivElement>(null)
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  useEffect(() => {
    const bar = barRef.current
    if (!bar || total === 0) return
    const parts = bar.querySelectorAll<HTMLElement>('[data-segment]')
    if (parts.length === 0) return

    const animation = motion(Array.from(parts), {
      // scaleX rather than width: it's compositor-only, so a dashboard with
      // several of these doesn't thrash layout.
      scaleX: [0, 1],
      duration: duration.settled,
      ease: ease.out,
      delay: stagger(60),
    })
    return () => {
      animation?.revert()
    }
  }, [total, segments.length])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>{title}</CardTitle>
          {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-2 text-[13px] text-ink-muted">{emptyMessage}</p>
        ) : (
          <>
            <div
              ref={barRef}
              className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken"
              role="img"
              aria-label={segments
                .map((segment) => `${segment.label}: ${segment.formatted}`)
                .join(', ')}
            >
              {segments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <span
                    key={segment.label}
                    data-segment
                    className="h-full origin-left rounded-full first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${(segment.value / total) * 100}%`,
                      background: segment.color,
                    }}
                  />
                ))}
            </div>

            <ul className="mt-4 space-y-2">
              {segments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <li key={segment.label} className="flex items-center gap-2 text-[13px]">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: segment.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-ink-secondary">{segment.label}</span>
                    <span className={cn('tabular font-medium text-ink')}>{segment.formatted}</span>
                    <span className="w-10 text-right tabular text-xs text-ink-muted">
                      {Math.round((segment.value / total) * 100)}%
                    </span>
                  </li>
                ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
