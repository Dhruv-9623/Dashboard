import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { reducedMotion } from '@/lib/motion'
import { ChartTooltipContent } from './ChartTooltipContent'

interface BarSeriesProps {
  data: Array<{ label: string; value: number }>
  format: (value: number) => string
  seriesName: string
  height?: number
  color?: string
}

/**
 * Counts over time, as bars.
 *
 * A bar per period rather than a line, because the measure is a count of
 * discrete events: a line between "two deals in March" and "none in April"
 * implies a value at every point in between, which doesn't exist.
 *
 * One colour for every bar. Shading bars darker-where-bigger would encode the
 * height twice and spend the only free channel on information already visible.
 */
export const BarSeries = ({
  data,
  format,
  seriesName,
  height = 160,
  color = 'var(--viz-1)',
}: BarSeriesProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap={4}>
      <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
        minTickGap={16}
        dy={6}
      />
      <YAxis
        width={32}
        tickLine={false}
        axisLine={false}
        tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
        allowDecimals={false}
        tickCount={3}
      />
      <Tooltip
        cursor={{ fill: 'var(--surface-hover)' }}
        content={<ChartTooltipContent format={format} seriesName={seriesName} swatch={color} />}
      />
      <Bar
        dataKey="value"
        fill={color}
        // Rounded at the data end only; the baseline end stays square so the
        // bar reads as anchored to the axis rather than floating.
        radius={[4, 4, 0, 0]}
        maxBarSize={28}
        isAnimationActive={!reducedMotion()}
        animationDuration={700}
      />
    </BarChart>
  </ResponsiveContainer>
)
