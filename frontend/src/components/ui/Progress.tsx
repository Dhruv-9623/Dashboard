import { cn } from '@/lib/utils'

interface ProgressProps {
  /** 0–100 */
  value: number
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'gray'
  className?: string
}

const tones = {
  blue: 'bg-blue-600',
  green: 'bg-green-600',
  amber: 'bg-amber-500',
  red: 'bg-red-600',
  gray: 'bg-gray-400',
}

export const Progress = ({ value, tone = 'blue', className }: ProgressProps) => {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-gray-200', className)}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', tones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
