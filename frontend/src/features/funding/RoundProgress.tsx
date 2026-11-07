import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { duration, ease, motion, stagger } from '@/lib/motion'
import { formatMoney } from '@/lib/constants'
import type { FundingCycleDTO } from './types'
import { pledgedAmount } from './types'

interface RoundProgressProps {
  cycle: FundingCycleDTO
  /** Hides the legend where space is tight, such as a deal-flow card. */
  compact?: boolean
  /**
   * Shows how far along the round is as a percentage, next to the target.
   *
   * Off by default and on where the round is the subject of the page: on a list of several rounds
   * the figures compare better than the percentages, but on one round "68% of target" is the first
   * thing anyone wants. It measures everything pledged against the target, not just signed money —
   * stated in the label, because a bare "68%" next to a committed figure reads as that figure's
   * percentage and would overstate the hard number.
   */
  percent?: boolean
  className?: string
}

/**
 * How far a round has got, with the three bands kept apart.
 *
 * This is the whole reason the API returns `committedAmount`, `softCommittedAmount` and
 * `indicatedAmount` separately. One bar labelled "committed" that quietly includes indications
 * tells a founder they have money they do not have — and they plan hiring against it. So the bar
 * is stacked, darkest for signed money, and the legend names each band with its own figure.
 *
 * The bands are an intensity scale, not categories, so they climb one ramp: jade for committed,
 * brand for soft, muted for an indication. Every segment is also labelled, so the colour is never
 * the only thing carrying the meaning.
 */
export const RoundProgress = ({ cycle, compact, percent, className }: RoundProgressProps) => {
  const barRef = useRef<HTMLDivElement>(null)

  const bands = [
    { key: 'committed', label: 'Committed', value: cycle.committedAmount, color: 'var(--positive)' },
    { key: 'soft', label: 'Soft', value: cycle.softCommittedAmount, color: 'var(--brand)' },
    { key: 'indicated', label: 'Indicated', value: cycle.indicatedAmount, color: 'var(--line-strong)' },
  ].filter((band) => band.value > 0)

  const pledged = pledgedAmount(cycle)
  const target = cycle.targetAmount || 1
  // Over-subscription is real and shouldn't overflow the bar; the figures still show the truth.
  const scale = Math.max(pledged, target)
  const pledgedPercent = Math.round((pledged / target) * 100)

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    const segments = bar.querySelectorAll<HTMLElement>('[data-band]')
    if (segments.length === 0) return
    const animation = motion(Array.from(segments), {
      scaleX: [0, 1],
      duration: duration.settled,
      ease: ease.out,
      delay: stagger(70),
    })
    return () => {
      animation?.revert()
    }
  }, [cycle.id, pledged])

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold tabular text-ink">
          {formatMoney(cycle.committedAmount, cycle.currency)}
          <span className="ml-1 text-[13px] font-normal text-ink-muted">committed</span>
        </span>
        <span className="text-[13px] tabular text-ink-muted">
          of {formatMoney(cycle.targetAmount, cycle.currency)}
          {percent && <> · {pledgedPercent}% pledged</>}
        </span>
      </div>

      <div
        ref={barRef}
        className="mt-2 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-surface-sunken"
        role="img"
        aria-label={[
          `${formatMoney(cycle.committedAmount, cycle.currency)} committed`,
          `${formatMoney(cycle.softCommittedAmount, cycle.currency)} soft committed`,
          `${formatMoney(cycle.indicatedAmount, cycle.currency)} indicated`,
          `of a ${formatMoney(cycle.targetAmount, cycle.currency)} target`,
        ].join(', ')}
      >
        {bands.map((band) => (
          <span
            key={band.key}
            data-band
            className="h-full origin-left rounded-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(band.value / scale) * 100}%`, background: band.color }}
          />
        ))}
      </div>

      {!compact && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {[
            { label: 'Committed', value: cycle.committedAmount, color: 'var(--positive)' },
            { label: 'Soft', value: cycle.softCommittedAmount, color: 'var(--brand)' },
            { label: 'Indicated', value: cycle.indicatedAmount, color: 'var(--line-strong)' },
          ].map((band) => (
            <li key={band.label} className="flex items-center gap-1.5 text-xs">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: band.color }}
              />
              <span className="text-ink-muted">{band.label}</span>
              <span className="tabular font-medium text-ink">
                {formatMoney(band.value, cycle.currency)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {pledged > cycle.targetAmount && (
        <p className={cn('text-xs text-positive', compact ? 'mt-1.5' : 'mt-2')}>
          Over-subscribed by {formatMoney(pledged - cycle.targetAmount, cycle.currency)}
        </p>
      )}
    </div>
  )
}
