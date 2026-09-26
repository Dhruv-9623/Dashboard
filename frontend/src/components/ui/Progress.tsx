import { cn } from '@/lib/utils'

interface ProgressProps {
  /** 0–100 */
  value: number
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray'
  className?: string
}

const tones = {
  blue: 'bg-brand',
  green: 'bg-positive',
  amber: 'bg-notice',
  red: 'bg-negative',
  gray: 'bg-line-strong',
}

export const Progress = ({ value, tone = 'blue', className }: ProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-hover', className)}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
