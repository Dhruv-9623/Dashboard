import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: string | number
  hint?: string
  tone?: 'default' | 'amber' | 'red'
}

const tones = {
  default: 'text-gray-900',
  amber: 'text-amber-600',
  red: 'text-red-600',
}

export const StatTile = ({ label, value, hint, tone = 'default' }: StatTileProps) => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className={cn('mt-1.5 text-2xl font-semibold tabular-nums', tones[tone])}>{value}</p>
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
)
