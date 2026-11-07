import type { ReactNode } from 'react'
import { MetricCard } from '@/components/MetricCard'

interface StatTileProps {
  label: string
  /** Widened to match MetricCard: a few tiles need their own type treatment for the figure. */
  value: ReactNode
  hint?: string
  tone?: 'default' | 'amber' | 'red'
}

/**
 * Kept as a thin wrapper over {@link MetricCard} so the pages that still use the
 * older name pick up the new card — border, elevation, micro-label and figure
 * treatment — without each one being rewritten.
 *
 * New code should use MetricCard directly: it also takes a delta, a trend and an
 * animated figure, none of which this signature can express.
 */
export const StatTile = ({ label, value, hint, tone = 'default' }: StatTileProps) => (
  <MetricCard
    label={label}
    value={value}
    hint={hint}
    tone={tone === 'amber' ? 'notice' : tone === 'red' ? 'negative' : 'default'}
  />
)
