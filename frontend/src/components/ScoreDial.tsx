import { cn } from '@/lib/utils'

interface ScoreDialProps {
  /** Fit score, 0–100. `null` while the scoring agent is still running. */
  score: number | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const dimensions = {
  sm: { box: 48, stroke: 4, text: 'text-sm' },
  md: { box: 72, stroke: 6, text: 'text-lg' },
  lg: { box: 112, stroke: 8, text: 'text-3xl' },
}

export const scoreBand = (score: number) => {
  if (score >= 75) return { tone: 'text-green-600', ring: 'stroke-green-500', label: 'Strong fit' }
  if (score >= 50) return { tone: 'text-amber-600', ring: 'stroke-amber-500', label: 'Partial fit' }
  return { tone: 'text-red-600', ring: 'stroke-red-500', label: 'Weak fit' }
}

export const ScoreDial = ({ score, size = 'md', className }: ScoreDialProps) => {
  const { box, stroke, text } = dimensions[size]
  const radius = (box - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pending = score === null
  const band = pending ? null : scoreBand(score)
  const offset = pending ? circumference : circumference * (1 - score / 100)

  return (
    <div className={cn('relative inline-flex shrink-0', className)} style={{ width: box, height: box }}>
      <svg width={box} height={box} className="-rotate-90">
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-gray-200"
        />
        {!pending && (
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn('transition-all duration-700', band?.ring)}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {pending ? (
          <span className="text-xs font-medium text-gray-400">···</span>
        ) : (
          <span className={cn('font-semibold tabular-nums', text, band?.tone)}>{Math.round(score)}</span>
        )}
      </div>
    </div>
  )
}
