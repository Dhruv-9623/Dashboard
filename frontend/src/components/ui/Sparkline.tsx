import { useId } from 'react'
import { cn } from '@/lib/utils'
import { useDrawIn } from '@/lib/useMotion'

interface SparklineProps {
  /** Two or more points. Rendered in order; the x-axis is just the index. */
  values: number[]
  className?: string
  /** Fill the area under the line. Off for a bare trend line in a table cell. */
  area?: boolean
  tone?: 'brand' | 'positive' | 'negative' | 'neutral'
  /** Delay the draw-in, so a row of sparklines reads left to right. */
  delay?: number
}

const tones = {
  brand: 'var(--brand)',
  positive: 'var(--positive)',
  negative: 'var(--negative)',
  neutral: 'var(--ink-muted)',
} as const

/**
 * A trend line, sized to its container. No axes, no labels — it sits beside a
 * figure that carries the value, and only shows the shape of the change.
 *
 * The path draws itself in on first paint (anime.js `createDrawable`), which is
 * what makes a wall of metrics feel alive rather than printed.
 */
export const Sparkline = ({
  values,
  className,
  area = true,
  tone = 'brand',
  delay = 0,
}: SparklineProps) => {
  const gradientId = useId()
  const svgRef = useDrawIn<SVGSVGElement>(values.join(','), delay)

  if (values.length < 2) return null

  // A 100×32 viewBox stretched by CSS: one coordinate system whatever the size.
  const width = 100
  const height = 32
  const min = Math.min(...values)
  const max = Math.max(...values)
  // A flat series would divide by zero; draw it down the middle instead.
  const span = max - min || 1
  const step = width / (values.length - 1)

  const points = values.map((value, index) => {
    const x = index * step
    // 2px of padding top and bottom so the stroke isn't clipped.
    const y = height - 2 - ((value - min) / span) * (height - 4)
    return [x, y] as const
  })

  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')
  const fill = `${line} L${width},${height} L0,${height} Z`

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('h-8 w-full overflow-visible', className)}
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={tones[tone]} stopOpacity="0.22" />
              <stop offset="100%" stopColor={tones[tone]} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fill} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        // `data-draw` is the hook useDrawIn looks for.
        data-draw
        d={line}
        fill="none"
        stroke={tones[tone]}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="2"
        fill={tones[tone]}
      />
    </svg>
  )
}
