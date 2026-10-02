import type { ReactNode } from 'react'
import { AiOrb } from '@/components/ai/AiOrb'
import { usePointerGlow } from '@/lib/useMotion'
import { cn } from '@/lib/utils'

interface DashboardHeroProps {
  /** "Good morning" / "Good evening" — set by the caller so it can be tested. */
  greeting: string
  /** The one sentence that says how the fund is doing. */
  headline: ReactNode
  /** Two or three supporting facts, rendered as a quiet row. */
  facts?: Array<{ label: string; value: string }>
  actions?: ReactNode
  /** Drives the orb: `thinking` while anything on the page is still loading. */
  busy?: boolean
  className?: string
}

/**
 * The top of the dashboard: one sentence about the state of the fund, on the
 * product's own dark surface, lit by the pointer.
 *
 * It exists because the page previously opened on a row of small white cards,
 * which is informative and completely anonymous. A single dark band with the orb
 * gives the product a face, and — more usefully — puts the one figure that
 * matters in a sentence rather than a grid.
 *
 * The light follows the cursor through `createAnimatable` (damped, so it trails
 * rather than snaps) and the whole effect is inert under reduced motion.
 */
export const DashboardHero = ({
  greeting,
  headline,
  facts,
  actions,
  busy,
  className,
}: DashboardHeroProps) => {
  const surface = usePointerGlow<HTMLDivElement>()

  return (
    <div
      ref={surface}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-line',
        'bg-hero text-hero-ink shadow-raised',
        className
      )}
    >
      {/* The pointer light. Two layers: a wide brand wash that follows the
          cursor, and a fixed corner bloom so the panel still has depth before
          anyone moves the mouse. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px"
        style={{
          background:
            'radial-gradient(520px circle at var(--glow-x, 78%) var(--glow-y, 0%), color-mix(in oklab, var(--viz-1) 38%, transparent), transparent 68%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full opacity-40 blur-3xl"
        style={{ background: 'color-mix(in oklab, var(--viz-3) 55%, transparent)' }}
      />

      <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="label-micro text-[color:color-mix(in_oklab,var(--hero-ink)_60%,transparent)]">
            {greeting}
          </p>
          <h2 className="mt-1.5 max-w-xl text-lg font-semibold leading-snug tracking-[-0.01em] sm:text-xl">
            {headline}
          </h2>

          {facts && facts.length > 0 && (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="label-micro text-[color:color-mix(in_oklab,var(--hero-ink)_55%,transparent)]">
                    {fact.label}
                  </dt>
                  <dd className="mt-0.5 text-[15px] font-semibold tabular">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>

        <AiOrb state={busy ? 'thinking' : 'idle'} size={104} className="shrink-0 sm:mr-2" />
      </div>
    </div>
  )
}

/** Local-time greeting. Exported so the hero stays a pure component. */
export const greetingFor = (date = new Date()) => {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
