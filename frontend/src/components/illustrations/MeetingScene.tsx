import { useEffect, useRef } from 'react'
import { createTimeline, svg, utils } from 'animejs'
import { cn } from '@/lib/utils'
import { duration, ease, reducedMotion, springs } from '@/lib/motion'

interface MeetingSceneProps {
  className?: string
  /** Stops the idle loop — for a still context like a print or a test. */
  still?: boolean
}

/**
 * Two sides of the platform noticing each other: an investor on the left, a
 * founder on the right, and the moment they connect in the middle.
 *
 * It is drawn in the product's own geometry — flat shapes, brand palette, the
 * same rounded corners as the cards — so it reads as part of the interface
 * rather than clip art dropped into it. The figures are deliberately abstract:
 * no faces, no gender, no skin tone, because this sits in front of founders and
 * partners across an entire market.
 *
 * Motion is a single anime.js timeline: the two figures arrive from their own
 * sides, the path between them draws, the spark lands on a spring, and then a
 * slow counter-phase bob keeps the scene alive. Under `prefers-reduced-motion`
 * nothing runs and the finished scene is what renders.
 */
export const MeetingScene = ({ className, still }: MeetingSceneProps) => {
  const root = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const scene = root.current
    if (!scene || reducedMotion() || still) return

    const investor = scene.querySelector<SVGGElement>('[data-investor]')
    const founder = scene.querySelector<SVGGElement>('[data-founder]')
    const spark = scene.querySelector<SVGGElement>('[data-spark]')
    const [link] = svg.createDrawable(scene.querySelectorAll<SVGPathElement>('[data-link]'))
    const coin = scene.querySelector<SVGGElement>('[data-coin]')
    const rocket = scene.querySelector<SVGGElement>('[data-rocket]')
    if (!investor || !founder || !spark) return

    utils.set([investor, founder], { opacity: 0 })
    utils.set(spark, { opacity: 0, scale: 0 })
    utils.set(link, { draw: '0 0' })

    const arrival = createTimeline({ defaults: { ease: ease.out } })
      // Each figure enters from its own side of the platform.
      .add(investor, { opacity: [0, 1], translateX: [-28, 0], duration: duration.settled }, 0)
      .add(founder, { opacity: [0, 1], translateX: [28, 0], duration: duration.settled }, 80)
      .add(link, { draw: '0 1', duration: 700, ease: ease.inOut }, 260)
      .add(spark, { opacity: [0, 1], scale: [0, 1], duration: 600, ease: springs.panel }, 760)

    // Idle: the two figures breathe in counter-phase, so the scene never sits
    // perfectly still but never pulls the eye either.
    const idle = createTimeline({ loop: true, defaults: { ease: 'inOutSine', duration: 2600 } })
      .add(investor, { translateY: [0, -3, 0] }, 0)
      .add(founder, { translateY: [0, -3, 0] }, 1300)
      .add(spark, { scale: [1, 1.12, 1], opacity: [1, 0.75, 1] }, 600)

    if (coin) idle.add(coin, { translateY: [0, -4, 0], rotate: [0, 8, 0] }, 300)
    if (rocket) idle.add(rocket, { translateY: [0, -5, 0] }, 900)

    return () => {
      arrival.revert()
      idle.revert()
    }
  }, [still])

  return (
    <svg
      ref={root}
      viewBox="0 0 340 150"
      role="img"
      aria-label="An investor and a founder meeting in the middle"
      className={cn('w-full max-w-sm', className)}
    >
      {/* Ground: a single hairline, so the figures are standing somewhere. */}
      <line x1="24" y1="126" x2="316" y2="126" stroke="var(--line)" strokeWidth="1.5" strokeLinecap="round" />

      {/* The connection: a dashed arc that draws from the investor to the founder. */}
      <path
        data-link
        d="M108 74 Q170 34 232 74"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 7"
        opacity="0.65"
      />

      {/* Investor — the deal side: a briefcase and capital. */}
      <g data-investor>
        <rect x="58" y="72" width="44" height="54" rx="14" fill="var(--viz-1)" opacity="0.18" />
        <rect x="58" y="72" width="44" height="54" rx="14" fill="none" stroke="var(--viz-1)" strokeWidth="2" />
        <circle cx="80" cy="52" r="15" fill="var(--viz-1)" opacity="0.18" />
        <circle cx="80" cy="52" r="15" fill="none" stroke="var(--viz-1)" strokeWidth="2" />
        {/* Briefcase */}
        <rect x="106" y="94" width="26" height="19" rx="4" fill="var(--surface)" stroke="var(--viz-1)" strokeWidth="2" />
        <path d="M115 94v-3a4 4 0 0 1 8 0v3" fill="none" stroke="var(--viz-1)" strokeWidth="2" strokeLinecap="round" />
        <path d="M106 103h26" stroke="var(--viz-1)" strokeWidth="1.5" opacity="0.5" />
        <g data-coin>
          <circle cx="44" cy="62" r="11" fill="var(--surface)" stroke="var(--viz-4)" strokeWidth="2" />
          <text
            x="44"
            y="67"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="var(--viz-4)"
            fontFamily="var(--font-sans)"
          >
            ₹
          </text>
        </g>
      </g>

      {/* Founder — the building side: a rocket. */}
      <g data-founder>
        <rect x="238" y="72" width="44" height="54" rx="14" fill="var(--viz-2)" opacity="0.18" />
        <rect x="238" y="72" width="44" height="54" rx="14" fill="none" stroke="var(--viz-2)" strokeWidth="2" />
        <circle cx="260" cy="52" r="15" fill="var(--viz-2)" opacity="0.18" />
        <circle cx="260" cy="52" r="15" fill="none" stroke="var(--viz-2)" strokeWidth="2" />
        <g data-rocket>
          {/* Body and nose cone. */}
          <path
            d="M304 52c7 8 7 20 0 28-7-8-7-20 0-28Z"
            fill="var(--surface)"
            stroke="var(--viz-2)"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Fins. */}
          <path d="M297 72l-5 8h7" fill="var(--surface)" stroke="var(--viz-2)" strokeWidth="2" strokeLinejoin="round" />
          <path d="M311 72l5 8h-7" fill="var(--surface)" stroke="var(--viz-2)" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="304" cy="63" r="3" fill="none" stroke="var(--viz-2)" strokeWidth="1.5" />
          {/* Flame. */}
          <path d="M304 82c2 3 2 6 0 8-2-2-2-5 0-8Z" fill="var(--viz-4)" />
        </g>
      </g>

      {/* The moment itself. */}
      <g data-spark style={{ transformOrigin: '170px 44px' }}>
        <path
          d="M170 28l4.4 10.6L185 43l-10.6 4.4L170 58l-4.4-10.6L155 43l10.6-4.4L170 28Z"
          fill="var(--viz-3)"
        />
        <circle cx="170" cy="43" r="19" fill="none" stroke="var(--viz-3)" strokeWidth="1.5" opacity="0.35" />
      </g>
    </svg>
  )
}
