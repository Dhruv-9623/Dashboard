import { useEffect, useRef } from 'react'
import type { Timeline } from 'animejs'
import { reducedMotion } from '@/lib/motion'

/**
 * Shared plumbing for the illustrated scenes.
 *
 * Every scene is an SVG plus one or more anime.js timelines. This holds the two
 * rules they all follow: nothing runs under `prefers-reduced-motion` (the static
 * SVG is the finished picture, so there is nothing to "complete"), and every
 * timeline is reverted on unmount so a scene that scrolls away stops costing
 * anything.
 */
export function useScene(build: (root: SVGSVGElement) => Array<Timeline | null | undefined>) {
  const ref = useRef<SVGSVGElement>(null)
  // Kept in a ref so a caller can pass an inline arrow without re-running the effect.
  const builder = useRef(build)
  builder.current = build

  useEffect(() => {
    const root = ref.current
    if (!root || reducedMotion()) return

    const timelines = builder.current(root).filter(Boolean) as Timeline[]
    return () => {
      for (const timeline of timelines) timeline.revert()
    }
  }, [])

  return ref
}
