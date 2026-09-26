import { useId } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { reducedMotion } from '@/lib/motion'
import { ChartTooltipContent } from './ChartTooltipContent'

interface AreaTrendProps {
  data: Array<{ label: string; value: number }>
  /** Formats a value for the tooltip — the precise figure. */
  format: (value: number) => string
  /** Formats an axis tick; defaults to `format`. Keep it short or it wraps. */
  tickFormat?: (value: number) => string
  /** What the single series is called, for the tooltip row. */
  seriesName: string
  height?: number
  color?: string
}

/**
 * One measure over time, as a filled line.
 *
 * Specs the chart follows, all from the same rulebook as the rest of the system:
 *  - **one series, one colour, no legend** — the card title names it
 *  - a 2px line over a fade, so the fill reads as context rather than a block
 *  - hairline solid gridlines on the value axis only; time doesn't need rules
 *  - a crosshair and tooltip that track the pointer, plus a 4px endpoint dot
 *  - axis ticks in tabular figures so they don't shuffle as the value grows
 */
export const AreaTrend = ({
  data,
  format,
  tickFormat,
  seriesName,
  height = 200,
  color = 'var(--viz-1)',
}: AreaTrendProps) => {
  const gradientId = useId().replace(/:/g, '')
  const animate = !reducedMotion()

  // A flat series at 0 would collapse the axis onto the baseline.
  const max = Math.max(...data.map((point) => point.value), 1)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.24} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid
          vertical={false}
          stroke="var(--line)"
          strokeWidth={1}
          // Solid, one shade off the surface: a grid should recede, and dashes
          // read as a threshold or a projection.
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
          minTickGap={24}
          dy={6}
        />
        <YAxis
          width={52}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
          tickFormatter={tickFormat ?? format}
          domain={[0, max]}
          tickCount={4}
        />
        <Tooltip
          cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
          content={<ChartTooltipContent format={format} seriesName={seriesName} swatch={color} />}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={animate}
          animationDuration={900}
          animationEasing="ease-out"
          // Dots only on hover: a marker per month is noise on a dense series.
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)', fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
