import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { reducedMotion } from '@/lib/motion'

export interface ScatterPoint {
  label: string
  x: number
  y: number
}

interface ScatterPlotProps {
  points: ScatterPoint[]
  xLabel: string
  yLabel: string
  formatX: (value: number) => string
  formatY: (value: number) => string
  height?: number
}

interface PointTooltipProps {
  active?: boolean
  payload?: Array<{ payload?: ScatterPoint }>
  xLabel: string
  yLabel: string
  formatX: (value: number) => string
  formatY: (value: number) => string
}

const PointTooltip = ({
  active,
  payload,
  xLabel,
  yLabel,
  formatX,
  formatY,
}: PointTooltipProps) => {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className="pointer-events-none rounded-lg border border-line bg-surface px-3 py-2 shadow-overlay">
      <p className="text-[13px] font-semibold text-ink">{point.label}</p>
      <dl className="mt-1 space-y-0.5 text-xs">
        <div className="flex gap-3">
          <dt className="text-ink-muted">{xLabel}</dt>
          <dd className="ml-auto tabular text-ink">{formatX(point.x)}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="text-ink-muted">{yLabel}</dt>
          <dd className="ml-auto tabular text-ink">{formatY(point.y)}</dd>
        </div>
      </dl>
    </div>
  )
}

/**
 * Two measures against each other, one dot per category.
 *
 * This is the chart that answers a question bars can't: whether a sector takes
 * many small cheques or a few large ones. Plotting both measures as bars would
 * need two y-scales on one plot, which invents a relationship — so they become
 * the two axes of a single plot instead, where the position *is* the comparison.
 *
 * Every dot is directly labelled, since there are only a handful and a legend
 * would make the reader look back and forth.
 */
export const ScatterPlot = ({
  points,
  xLabel,
  yLabel,
  formatX,
  formatY,
  height = 260,
}: ScatterPlotProps) => (
  <ResponsiveContainer width="100%" height={height}>
    <ScatterChart margin={{ top: 16, right: 24, bottom: 20, left: 4 }}>
      <CartesianGrid stroke="var(--line)" strokeWidth={1} />
      <XAxis
        type="number"
        dataKey="x"
        name={xLabel}
        tickLine={false}
        axisLine={false}
        tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
        tickFormatter={formatX}
        allowDecimals={false}
        label={{
          value: xLabel,
          position: 'insideBottom',
          offset: -12,
          fill: 'var(--ink-muted)',
          fontSize: 11,
        }}
      />
      <YAxis
        type="number"
        dataKey="y"
        name={yLabel}
        width={56}
        tickLine={false}
        axisLine={false}
        tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
        tickFormatter={formatY}
      />
      <Tooltip
        cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
        content={
          <PointTooltip xLabel={xLabel} yLabel={yLabel} formatX={formatX} formatY={formatY} />
        }
      />
      <Scatter
        data={points}
        fill="var(--viz-1)"
        // A surface-coloured ring keeps two close dots from merging into a blob.
        stroke="var(--surface)"
        strokeWidth={2}
        isAnimationActive={!reducedMotion()}
        animationDuration={700}
      >
        <LabelList
          dataKey="label"
          position="top"
          offset={10}
          className="fill-[var(--ink-secondary)]"
          fontSize={11}
        />
      </Scatter>
    </ScatterChart>
  </ResponsiveContainer>
)
