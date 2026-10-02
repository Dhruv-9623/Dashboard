import { createTimeline, stagger, utils } from 'animejs'
import { cn } from '@/lib/utils'
import { duration, ease, springs } from '@/lib/motion'
import { useScene } from './useScene'

/**
 * Picking one out to keep: a stack of companies with the saved one lifted clear
 * and marked.
 *
 * The saved card leaves the stack rather than being highlighted inside it,
 * because that is what a wishlist does — it takes a name out of the flow of
 * everything you've seen and sets it aside for later.
 */
export const ShortlistScene = ({ className }: { className?: string }) => {
  const ref = useScene((root) => {
    const cards = root.querySelectorAll('[data-card]')
    const saved = root.querySelector('[data-saved]')
    const heart = root.querySelector('[data-heart]')
    if (cards.length === 0 || !saved || !heart) return []

    utils.set(cards, { opacity: 0 })
    utils.set(saved, { opacity: 0 })
    utils.set(heart, { opacity: 0, scale: 0 })

    return [
      createTimeline({ defaults: { ease: ease.out } })
        .add(cards, { opacity: [0, 1], translateY: [10, 0], duration: 420, delay: stagger(80) }, 0)
        .add(saved, { opacity: [0, 1], translateY: [14, 0], duration: duration.settled }, 320)
        .add(heart, { opacity: [0, 1], scale: [0, 1], duration: 520, ease: springs.panel }, 620),

      // The saved card keeps floating a little above the stack it came out of.
      createTimeline({ loop: true, defaults: { ease: 'inOutSine', duration: 2800 } })
        .add(saved, { translateY: [0, -4, 0] }, 1100)
        .add(heart, { scale: [1, 1.12, 1] }, 1100),
    ]
  })

  return (
    <svg
      ref={ref}
      viewBox="0 0 340 150"
      role="img"
      aria-label="A company saved out of a list for later"
      className={cn('w-full max-w-sm', className)}
    >
      {/* The stack you were looking through. */}
      {[0, 1, 2].map((index) => (
        <g data-card key={index}>
          <rect
            x={62}
            y={54 + index * 26}
            width="120"
            height="20"
            rx="6"
            fill="var(--surface-sunken)"
            stroke="var(--line)"
            strokeWidth="1.5"
          />
          <circle cx={76} cy={64 + index * 26} r="5" fill="var(--line-strong)" opacity="0.7" />
          <rect x={88} y={60 + index * 26} width={index === 1 ? 52 : 74} height="6" rx="3" fill="var(--line-strong)" opacity="0.6" />
        </g>
      ))}

      {/* The one you kept. */}
      <g data-saved>
        <rect
          x="196"
          y="62"
          width="122"
          height="46"
          rx="10"
          fill="var(--surface)"
          stroke="var(--viz-1)"
          strokeWidth="2"
        />
        <rect x="208" y="74" width="22" height="22" rx="6" fill="var(--viz-1)" opacity="0.22" />
        <rect x="238" y="76" width="62" height="7" rx="3.5" fill="var(--viz-1)" opacity="0.55" />
        <rect x="238" y="88" width="40" height="6" rx="3" fill="var(--line-strong)" opacity="0.7" />
      </g>

      <g data-heart style={{ transformOrigin: '310px 62px' }}>
        <circle cx="310" cy="62" r="13" fill="var(--surface)" stroke="var(--viz-6)" strokeWidth="2" />
        <path
          d="M310 68c-4-3-7-5.2-7-8a3.6 3.6 0 0 1 7-1.4 3.6 3.6 0 0 1 7 1.4c0 2.8-3 5-7 8Z"
          fill="var(--viz-6)"
        />
      </g>
    </svg>
  )
}
