import { createTimeline, svg, utils } from 'animejs'
import { cn } from '@/lib/utils'
import { duration, ease } from '@/lib/motion'
import { useScene } from './useScene'

/**
 * A first approach: a note leaving the investor and crossing to a founder who
 * hasn't connected yet.
 *
 * The founder is drawn lighter than the investor on purpose — at this point
 * they're someone you're reaching *towards*, not someone you have a
 * relationship with. The note travels the actual dashed path with
 * `createMotionPath`, so it banks into the curve rather than sliding flat
 * across it.
 */
export const OutreachScene = ({ className }: { className?: string }) => {
  const ref = useScene((root) => {
    const sender = root.querySelector('[data-sender]')
    const recipient = root.querySelector('[data-recipient]')
    const plane = root.querySelector('[data-plane]')
    const route = root.querySelector<SVGPathElement>('[data-route]')
    if (!sender || !recipient || !plane || !route) return []

    const [drawable] = svg.createDrawable(route)
    const path = svg.createMotionPath(route)

    utils.set([sender, recipient], { opacity: 0 })
    utils.set(drawable, { draw: '0 0' })
    utils.set(plane, { opacity: 0 })

    return [
      createTimeline({ defaults: { ease: ease.out } })
        .add(sender, { opacity: [0, 1], translateX: [-16, 0], duration: duration.settled }, 0)
        .add(recipient, { opacity: [0, 0.75], translateX: [16, 0], duration: duration.settled }, 120)
        .add(drawable, { draw: '0 1', duration: 700, ease: ease.inOut }, 300),

      // The note crosses, pauses at the far end, and the loop sends the next one.
      createTimeline({ loop: true })
        .add(plane, { opacity: [{ to: 1, duration: 200 }] }, 900)
        .add(
          plane,
          {
            translateX: path.translateX,
            translateY: path.translateY,
            rotate: path.rotate,
            duration: 2400,
            ease: 'inOutQuad',
          },
          900
        )
        .add(plane, { opacity: [{ to: 0, duration: 300 }] }, 3300)
        .add(plane, { opacity: 0, duration: 900 }, 3600),
    ]
  })

  return (
    <svg
      ref={ref}
      viewBox="0 0 340 150"
      role="img"
      aria-label="A note travelling from an investor to a founder"
      className={cn('w-full max-w-sm', className)}
    >
      <line x1="30" y1="126" x2="310" y2="126" stroke="var(--line)" strokeWidth="1.5" strokeLinecap="round" />

      <path
        data-route
        d="M108 70 Q170 26 236 68"
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2"
        strokeDasharray="1 7"
        strokeLinecap="round"
        opacity="0.55"
      />

      {/* Sender: your firm. */}
      <g data-sender>
        <rect x="58" y="74" width="42" height="52" rx="14" fill="var(--viz-1)" opacity="0.18" />
        <rect x="58" y="74" width="42" height="52" rx="14" fill="none" stroke="var(--viz-1)" strokeWidth="2" />
        <circle cx="79" cy="54" r="14" fill="var(--viz-1)" opacity="0.18" />
        <circle cx="79" cy="54" r="14" fill="none" stroke="var(--viz-1)" strokeWidth="2" />
      </g>

      {/* Recipient: lighter, because they haven't answered yet. */}
      <g data-recipient opacity="0.75">
        <rect
          x="240"
          y="74"
          width="42"
          height="52"
          rx="14"
          fill="none"
          stroke="var(--viz-2)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
        <circle
          cx="261"
          cy="54"
          r="14"
          fill="none"
          stroke="var(--viz-2)"
          strokeWidth="2"
          strokeDasharray="5 4"
        />
      </g>

      {/* The note itself, drawn at the origin and moved along the path. */}
      <g data-plane>
        <path d="M-9 -6L9 0L-9 6L-5 0Z" fill="var(--viz-4)" />
        <path d="M-5 0L9 0" stroke="var(--surface)" strokeWidth="1" opacity="0.7" />
      </g>
    </svg>
  )
}
