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
}: ChartFrameProps) => (
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
      <div className={cn('transition-opacity duration-200', stale && 'opacity-50')}>{children}</div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{table.columns[0]}</th>
            <th scope="col">{table.columns[1]}</th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </CardContent>
  </Card>
)

/** Shown in a chart's place when there isn't enough history to plot. */
export const ChartEmpty = ({ message }: { message: string }) => (
  <div className="flex h-[180px] items-center justify-center rounded-lg border border-dashed border-line bg-surface-sunken/50 px-6">
    <p className="max-w-xs text-center text-[13px] text-ink-muted">{message}</p>
  </div>
)
