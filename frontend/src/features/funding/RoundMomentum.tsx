import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { reducedMotion } from '@/lib/motion'
import { formatMoneyShort, formatDate, formatMoney } from '@/lib/constants'
import { roundFillSeries } from './types'
import type { CommitmentEventDTO, FundingCycleDTO } from './types'

interface RoundMomentumProps {
  cycle: FundingCycleDTO
  events: CommitmentEventDTO[]
  height?: number
}

/** The three bands, in stack order and in the colours RoundProgress already uses for them. */
const bands = [
  { key: 'indicated', label: 'Indicated', color: 'var(--line-strong)' },
  { key: 'softCommitted', label: 'Soft', color: 'var(--brand)' },
  { key: 'committed', label: 'Committed', color: 'var(--positive)' },
] as const

/**
 * The chart's accessible equivalent, for `ChartFrame`'s table.
 *
 * All three bands per row, not just the total: an investor moving an indication to a soft
 * commitment changes nothing about the total, so a table of totals alone would print two identical
 * rows and hide the move the chart plainly shows.
 *
 * Exported so the round page and the founder's Insights card build it the same way — the two sit
 * on different screens and would otherwise drift.
 */
export const roundFillTable = (
  events: CommitmentEventDTO[],
  cycle: FundingCycleDTO,
): Array<[string, string]> =>
  roundFillSeries(events, cycle.openedAt).map((point) => [
    formatDate(point.at),
    [
      `${formatMoney(point.committed, cycle.currency)} committed`,
      `${formatMoney(point.softCommitted, cycle.currency)} soft`,
      `${formatMoney(point.indicated, cycle.currency)} indicated`,
      `${formatMoney(point.pledged, cycle.currency)} pledged in all`,
    ].join(', '),
  ])

/**
 * Tooltip for a stacked chart, which the shared `ChartTooltipContent` can't do — it reads one
 * series. The shape is deliberately identical to it: the same micro-label header, the same swatch,
 * name and right-aligned tabular figure per row, so moving between charts on a page doesn't feel
 * like moving between products.
 */
const MomentumTooltip = ({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number | string | Array<number | string> }>
  label?: string | number
  currency: string
}) => {
  if (!active || !payload?.length) return null

  // Top-down, so the rows read in the same order as the stack they describe.
  const rows = [...bands].reverse().map((band) => {
    const entry = payload.find((item) => item.dataKey === band.key)
    return { ...band, value: typeof entry?.value === 'number' ? entry.value : 0 }
  })
  const total = rows.reduce((sum, row) => sum + row.value, 0)

  return (
    <div className="pointer-events-none min-w-44 rounded-lg border border-line bg-surface px-3 py-2 shadow-overlay">
      <p className="label-micro">{typeof label === 'string' ? formatDate(label) : label}</p>
      <div className="mt-1 space-y-1">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full"
              style={{ background: row.color }}
            />
            <span className="text-xs text-ink-secondary">{row.label}</span>
            <span className="ml-auto pl-3 text-[13px] font-semibold tabular text-ink">
              {formatMoney(row.value, currency)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-line pt-1">
          <span className="text-xs text-ink-muted">Pledged</span>
          <span className="ml-auto pl-3 text-[13px] font-semibold tabular text-ink">
            {formatMoney(total, currency)}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * How the round filled, over time.
 *
 * Stacked rather than one line, for the reason the whole feature exists: a single "raised" curve
 * climbing toward the target would show a founder money they may not have. Here the signed money
 * is the dark band at the bottom and the conversations sit on top of it, so the shape of the
 * stack says how solid the total is.
 *
 * `stepAfter`, not a curve. The round's standing changes at a moment and then holds until the
 * next investor moves; a smooth line between two events would draw amounts that never existed —
 * the same reason the deal-count chart uses bars rather than a line.
 *
 * The target is a reference line rather than the axis maximum, so an over-subscribed round visibly
 * crosses it instead of quietly filling the frame.
 */
export const RoundMomentum = ({ cycle, events, height = 220 }: RoundMomentumProps) => {
  const data = roundFillSeries(events, cycle.openedAt)
  const animate = !reducedMotion()

  const peak = Math.max(...data.map((point) => point.pledged), cycle.targetAmount, 1)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeWidth={1} />
        <XAxis
          dataKey="at"
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
          tickFormatter={(value: string) => formatDate(value)}
          minTickGap={24}
          dy={6}
        />
        <YAxis
          width={44}
          domain={[0, peak]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: 'var(--ink-muted)', fontSize: 11 }}
          tickFormatter={(value: number) => formatMoneyShort(value, cycle.currency)}
        />
        <Tooltip
          cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
          content={<MomentumTooltip currency={cycle.currency} />}
        />

        <ReferenceLine
          y={cycle.targetAmount}
          stroke="var(--ink-muted)"
          strokeDasharray="4 4"
          label={{
            value: `Target ${formatMoneyShort(cycle.targetAmount, cycle.currency)}`,
            position: 'insideTopRight',
            fill: 'var(--ink-muted)',
            fontSize: 11,
          }}
        />

        {bands.map((band) => (
          <Area
            key={band.key}
            type="stepAfter"
            dataKey={band.key}
            name={band.label}
            stackId="bands"
            stroke={band.color}
            strokeWidth={1.5}
            fill={band.color}
            fillOpacity={0.22}
            isAnimationActive={animate}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
