/**
 * Recharts 3 hands the content component a loosely-typed payload, so the props
 * are declared here rather than derived from its exported TooltipProps.
 */
interface ChartTooltipContentProps {
  active?: boolean
  payload?: Array<{ value?: number | string | Array<number | string> }>
  label?: string | number
  format: (value: number) => string
  seriesName: string
  swatch: string
}

/**
 * The tooltip shared by every chart here.
 *
 * Kept in one place so the period, the label and the figure are always in the
 * same order and the same type sizes — a tooltip that changes shape between two
 * charts on one page is the thing people notice without being able to say why.
 *
 * The value uses tabular figures: the tooltip follows the cursor, and
 * proportional digits make it jitter as the number changes width.
 */
export const ChartTooltipContent = ({
  active,
  payload,
  label,
  format,
  seriesName,
  swatch,
}: ChartTooltipContentProps) => {
  if (!active || !payload?.length) return null

  const value = payload[0].value
  if (typeof value !== 'number') return null

  return (
    <div className="pointer-events-none rounded-lg border border-line bg-surface px-3 py-2 shadow-overlay">
      <p className="label-micro">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full"
          style={{ background: swatch }}
        />
        <span className="text-xs text-ink-secondary">{seriesName}</span>
        <span className="ml-auto pl-3 text-[13px] font-semibold tabular text-ink">
          {format(value)}
        </span>
      </div>
    </div>
  )
}
