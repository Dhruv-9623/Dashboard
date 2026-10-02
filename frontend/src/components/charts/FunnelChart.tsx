import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { duration, ease, motion, stagger } from '@/lib/motion'
import { ArrowDownRightIcon } from '@/components/icons'

export interface FunnelStage {
  label: string
  count: number
}

interface FunnelChartProps {
  stages: FunnelStage[]
  className?: string
}

/**
 * A funnel, with the drop-off named between each pair of stages.
 *
 * The bars alone were the old version of this, and they showed the counts a
 * reader could already see in the numbers. The insight in a funnel isn't the
 * heights — it's where people fall out, so the conversion from each stage to
 * the next is computed and labelled. A stage that loses 80% is the story.
 *
 * Widths are relative to the first stage, not to the largest, so the shape is a
 * funnel rather than a bar chart that happens to be sorted.
 */
export const FunnelChart = ({ stages, className }: FunnelChartProps) => {
  const ref = useRef<HTMLOListElement>(null)
  const top = stages[0]?.count ?? 0

  useEffect(() => {
    const list = ref.current
    if (!list) return
    const bars = list.querySelectorAll<HTMLElement>('[data-funnel-bar]')
    if (bars.length === 0) return
    const animation = motion(Array.from(bars), {
      scaleX: [0, 1],
      duration: duration.settled,
      ease: ease.out,
      delay: stagger(70),
    })
    return () => {
      animation?.revert()
    }
  }, [stages])

  if (stages.length === 0 || top === 0) return null

  return (
    <ol ref={ref} className={cn('space-y-1', className)}>
      {stages.map((stage, index) => {
        const previous = index > 0 ? stages[index - 1] : null
        // Conversion from the previous stage, which is the number people act on.
        const conversion = previous && previous.count > 0 ? stage.count / previous.count : null
        const width = Math.max((stage.count / top) * 100, 2)
        // Roughly the room a stage name needs before it would be clipped.
        const inside = width > 38

        return (
          <li key={stage.label}>
            {conversion !== null && (
              <div className="flex items-center gap-1.5 py-1 pl-1 text-[11px] text-ink-muted">
                <ArrowDownRightIcon className="size-3" aria-hidden="true" />
                <span className="tabular">
                  {Math.round(conversion * 100)}% continue
                </span>
                {conversion < 1 && (
                  <span className="tabular text-ink-muted/70">
                    · {previous!.count - stage.count} drop off
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="relative h-11 flex-1 overflow-hidden rounded-lg bg-surface-sunken">
                <div
                  data-funnel-bar
                  className="absolute inset-y-0 left-0 origin-left rounded-lg"
                  style={{
                    width: `${width}%`,
                    // Each stage one step deeper down the sequential ramp: the
                    // funnel is an ordered scale, which is the one case where a
                    // ramp on categories is right.
                    background: `var(--seq-${Math.min(index + 1, 5)})`,
                  }}
                />
                <div className="relative flex h-full items-center justify-between pr-3">
                  {/* Inside the fill when there's room for it; otherwise just
                      past the fill's end, so the text never straddles the edge. */}
                  <span
                    className={cn(
                      'truncate text-[13px] font-medium transition-[padding]',
                      inside ? 'text-white' : 'text-ink'
                    )}
                    style={{ paddingLeft: inside ? '0.75rem' : `calc(${width}% + 0.75rem)` }}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 pl-3 text-[13px] font-semibold tabular',
                      width > 92 ? 'text-white' : 'text-ink'
                    )}
                  >
                    {stage.count}
                  </span>
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
