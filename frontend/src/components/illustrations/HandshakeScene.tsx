import { createTimeline, utils } from 'animejs'
import { cn } from '@/lib/utils'
import { duration, ease, springs } from '@/lib/motion'
import { useScene } from './useScene'

/**
 * Mutual consent, drawn: two sides reaching out, and the moment the connection
 * completes.
 *
 * This sits where the product explains that a chat only opens once both people
 * have agreed to it — the one rule that makes the platform not-a-spam-channel.
 * The two arms meet exactly in the middle and neither arrives first, because
 * "both sides" is the whole point.
 */
export const HandshakeScene = ({ className }: { className?: string }) => {
  const ref = useScene((root) => {
    const left = root.querySelector('[data-left]')
    const right = root.querySelector('[data-right]')
    const clasp = root.querySelector('[data-clasp]')
    const ring = root.querySelector('[data-ring]')
    if (!left || !right || !clasp || !ring) return []

    utils.set([left, right], { opacity: 0 })
    utils.set(clasp, { opacity: 0, scale: 0 })
    utils.set(ring, { opacity: 0, scale: 0.4 })

    return [
      createTimeline({ defaults: { ease: ease.out } })
        // Neither side leads: both arrive on the same beat.
        .add(left, { opacity: [0, 1], translateX: [-20, 0], duration: duration.settled }, 0)
        .add(right, { opacity: [0, 1], translateX: [20, 0], duration: duration.settled }, 0)
        .add(clasp, { opacity: [0, 1], scale: [0, 1], duration: 520, ease: springs.panel }, 420),

      // The agreement keeps radiating: one slow ring, forever.
      createTimeline({ loop: true })
        .add(ring, {
          opacity: [{ to: 0.5, duration: 400 }, { to: 0, duration: 1800 }],
          scale: [{ to: 0.4, duration: 0 }, { to: 1.5, duration: 2200, ease: 'outQuad' }],
        }, 900),
    ]
  })

  return (
    <svg
      ref={ref}
      viewBox="0 0 340 150"
      role="img"
      aria-label="Two people reaching out and connecting"
      className={cn('w-full max-w-sm', className)}
    >
      <line x1="30" y1="126" x2="310" y2="126" stroke="var(--line)" strokeWidth="1.5" strokeLinecap="round" />

      {/* The pulse the agreement sends out. */}
      <circle
        data-ring
        cx="170"
        cy="86"
        r="34"
        fill="none"
        stroke="var(--viz-3)"
        strokeWidth="2"
        style={{ transformOrigin: '170px 86px' }}
      />

      <g data-left>
        <rect x="64" y="74" width="42" height="52" rx="14" fill="var(--viz-1)" opacity="0.18" />
        <rect x="64" y="74" width="42" height="52" rx="14" fill="none" stroke="var(--viz-1)" strokeWidth="2" />
        <circle cx="85" cy="54" r="14" fill="var(--viz-1)" opacity="0.18" />
        <circle cx="85" cy="54" r="14" fill="none" stroke="var(--viz-1)" strokeWidth="2" />
        {/* The arm, reaching to the midpoint. */}
        <path d="M106 90h50" stroke="var(--viz-1)" strokeWidth="6" strokeLinecap="round" />
      </g>

      <g data-right>
        <rect x="234" y="74" width="42" height="52" rx="14" fill="var(--viz-2)" opacity="0.18" />
        <rect x="234" y="74" width="42" height="52" rx="14" fill="none" stroke="var(--viz-2)" strokeWidth="2" />
        <circle cx="255" cy="54" r="14" fill="var(--viz-2)" opacity="0.18" />
        <circle cx="255" cy="54" r="14" fill="none" stroke="var(--viz-2)" strokeWidth="2" />
        <path d="M234 90h-50" stroke="var(--viz-2)" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* Where the two arms meet. */}
      <g data-clasp style={{ transformOrigin: '170px 90px' }}>
        <circle cx="170" cy="90" r="15" fill="var(--surface)" stroke="var(--viz-3)" strokeWidth="2" />
        <path
          d="M163 90l5 5 9-10"
          fill="none"
          stroke="var(--viz-3)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
