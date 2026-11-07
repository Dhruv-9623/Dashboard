import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface ChartFrameProps {
  title: string
  /** One line saying what the chart measures — including any limit on the data. */
  description?: string
  /** A figure or control to the right of the title. */
  aside?: ReactNode
  /** The accessible equivalent: every plotted value, as rows. */
  table: { columns: [string, string]; rows: Array<[string, string]> }
  children: ReactNode
  className?: string
  /** Dims the plot during a refetch instead of flashing a skeleton. */
  stale?: boolean
}

/**
 * The shell every chart sits in: title, one line of context, the plot, and a
 * screen-reader table carrying the same values.
 *
 * The table isn't a nicety. A chart that can only be read by looking at it, or
 * only by hovering it, isn't readable by everyone — so each plot ships with its
 * values as rows, which also makes the numbers selectable and copyable.
 */
export const ChartFrame = ({
  title,
  description,
  aside,
  table,
  children,
  className,
  stale,
}: ChartFrameProps) => {
  const plotRef = useRef<HTMLDivElement>(null)

  /**
   * Names the plot Recharts renders, and demotes its role.
   *
   * Recharts puts `tabindex="0"` and `role="application"` on its own `<svg>`. Both are wrong here:
   * a focus stop must have an accessible name (WCAG 4.1.2) and it has none, and `application`
   * tells a screen reader to stop interpreting keys and hand them to a widget that doesn't listen
   * for any. It isn't ours to pass a prop to, so the fix is applied to the mounted node.
   *
   * Via an observer rather than on mount: `ResponsiveContainer` measures the box first and only
   * then renders the svg, so on the first effect there is nothing to find — and it re-renders the
   * svg on resize, which would drop the attributes again.
   */
  useEffect(() => {
    const plot = plotRef.current
    if (!plot) return

    const label = `${title} — chart. The same values follow as a table.`
    const apply = () => {
      const surface = plot.querySelector('svg.recharts-surface')
      if (!surface || surface.getAttribute('aria-label') === label) return
      surface.setAttribute('role', 'img')
      surface.setAttribute('aria-label', label)
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(plot, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [title])

  return (
  <Card className={cn('flex flex-col', className)}>
    <CardHeader>
      <div className="min-w-0">
        <CardTitle>{title}</CardTitle>
        {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
      </div>
      {aside}
    </CardHeader>
    <CardContent className="flex-1 pb-3">
      {/* Held at reduced opacity while refetching: no skeleton flash, no layout jump. */}
      <div
        ref={plotRef}
        className={cn('transition-opacity duration-200', stale && 'opacity-50')}
      >
        {children}
      </div>

      {/* The wrapper carries `sr-only`, not the table.
          A table's used width is never less than its min-content width, so `sr-only`'s
          `width: 1px` does nothing to a <table> — a chart whose rows are wordy then widens the
          whole document and the page scrolls sideways on a phone. The wrapper is 1px with
          `overflow: hidden`, which clips it properly. */}
      <div className="sr-only">
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{table.columns[0]}</th>
            <th scope="col">{table.columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {/* Keyed by position, not by label: a time series can legitimately have two points on
              one day, and keying by the date made React drop one of them and warn. */}
          {table.rows.map(([label, value], index) => (
            <tr key={index}>
              <th scope="row">{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </CardContent>
  </Card>
  )
}

/** Shown in a chart's place when there isn't enough history to plot. */
export const ChartEmpty = ({ message }: { message: string }) => (
  <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-line bg-surface-sunken/50 px-6">
    <p className="max-w-xs text-center text-[13px] text-ink-muted">{message}</p>
  </div>
)
