import { useEffect, useRef } from 'react'
import { svg } from 'animejs'
import { cn } from '@/lib/utils'
import { duration, ease, motion, reducedMotion, utils } from '@/lib/motion'

interface MatchScoreProps {
  /** 0–1, as the API returns it. */
  score: number
  size?: number
  className?: string
}

const CIRCUMFERENCE = 2 * Math.PI * 20

/**
 * A model's confidence, as a ring that fills to the score.
 *
 * The ring draws itself in and the number counts with it, so the value arrives
 * as a measurement being taken rather than a verdict already printed. Colour is
 * a band, not a gradient — 80+ reads as strong, under 50 as weak — and the
 * number is always there, so the colour is never the only signal.
 */
export const MatchScore = ({ score, size = 44, className }: MatchScoreProps) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100)

  const tone =
    percent >= 80 ? 'var(--positive)' : percent >= 50 ? 'var(--viz-1)' : 'var(--ink-muted)'

  useEffect(() => {
    const root = svgRef.current
    const label = labelRef.current
    if (!root || !label) return

    const arc = root.querySelector<SVGCircleElement>('[data-arc]')
    if (!arc) return

    if (reducedMotion()) {
      arc.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - percent / 100))
      label.textContent = String(percent)
      return
    }

    const [drawable] = svg.createDrawable(arc)
    const state = { value: 0 }

    const ring = motion(drawable, {
      draw: `0 ${percent / 100}`,
      duration: duration.deliberate,
      ease: ease.out,
    })
    const counter = motion(state as never, {
      value: percent,
      duration: duration.deliberate,
      ease: ease.out,
      onUpdate: () => {
        label.textContent = String(Math.round(state.value))
      },
      onComplete: () => {
        label.textContent = String(percent)
      },
    })

    return () => {
      ring?.revert()
      counter?.revert()
      utils.remove(state)
    }
  }, [percent])

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Match score ${percent} out of 100`}
    >
      <svg ref={svgRef} viewBox="0 0 44 44" className="size-full -rotate-90">
        <circle cx="22" cy="22" r="20" fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle
          data-arc
          cx="22"
          cy="22"
          r="20"
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE}
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular text-ink"
      >
        <span ref={labelRef}>{percent}</span>
      </span>
    </div>
  )
}
