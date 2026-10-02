import { animate, createTimer, spring, stagger, utils } from 'animejs'
import type { JSAnimation } from 'animejs'

/**
 * Motion tokens and primitives, built on anime.js.
 *
 * Two rules the whole layer follows:
 *
 *  1. **Motion carries meaning or it doesn't ship.** Every helper here exists to
 *     explain something — where a row went when the table re-sorted, that a
 *     figure changed, that a panel came from the edge it came from. Nothing
 *     moves just to prove it can.
 *  2. **`prefers-reduced-motion` is honoured at the source.** Callers never have
 *     to remember: each helper checks {@link reducedMotion} and, when set, jumps
 *     straight to the finished state instead of animating to it. That is the
 *     accessible behaviour — the end state must still be correct, not skipped.
 */

/** Durations, in ms. Short enough to feel immediate; long enough to be followed. */
export const duration = {
  /** Hover, press, colour changes. */
  instant: 120,
  /** The default: entrances, fades, counters. */
  quick: 260,
  /** Panels, overlays, layout changes. */
  settled: 420,
  /** Figures counting up, lines drawing in. */
  deliberate: 900,
} as const

/**
 * Easings. `outQuint` for things arriving (fast, then a long settle, which is
 * what expensive software feels like), `inOutQuad` for things moving between two
 * known places, and springs for anything the user summoned.
 */
export const ease = {
  out: 'outQuint',
  inOut: 'inOutQuad',
  in: 'inQuad',
} as const

export const springs = {
  /** Overlays and panels: a single soft overshoot. */
  panel: spring({ stiffness: 190, damping: 22 }),
  /** Small, snappy: toggles, chips, the nav indicator. */
  snap: spring({ stiffness: 320, damping: 26 }),
  /** Barely there: hover lifts. */
  subtle: spring({ stiffness: 260, damping: 30 }),
} as const

/** Per-item delay for a staggered group, in ms. Kept small — long staircases feel slow. */
export const STAGGER_STEP = 24

let reducedMotionQuery: MediaQueryList | null = null

/**
 * Whether the viewer has asked for reduced motion. Read live rather than cached,
 * so changing the OS setting takes effect without a reload.
 */
export function reducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  reducedMotionQuery ??= window.matchMedia('(prefers-reduced-motion: reduce)')
  return reducedMotionQuery.matches
}

type Targets = Parameters<typeof animate>[0]

/** Applies the finished state without animating. Used by every reduced-motion path. */
function settle(targets: Targets, properties: Parameters<typeof animate>[1]) {
  const final: Record<string, unknown> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'delay' || key === 'duration' || key === 'ease' || key === 'onComplete') continue
    // `{ from: x }` and `[from, to]` both describe a starting point; the end state
    // is the element's own value, so there is nothing to set.
    if (Array.isArray(value)) final[key] = value[value.length - 1]
    else if (value && typeof value === 'object' && 'from' in value) continue
    else final[key] = value
  }
  if (Object.keys(final).length > 0) utils.set(targets, final as Parameters<typeof utils.set>[1])
}

/**
 * `animate`, but reduced-motion-safe. Returns null when motion is off, having
 * already applied the end state.
 */
export function motion(
  targets: Targets,
  properties: Parameters<typeof animate>[1]
): JSAnimation | null {
  if (reducedMotion()) {
    settle(targets, properties)
    return null
  }
  return animate(targets, properties)
}

/**
 * The entrance used for cards, rows and list items: a short rise out of
 * transparency, staggered across the group.
 *
 * The 8px offset is deliberate — enough to read as "this arrived", small enough
 * that a long list doesn't look like it's falling into place.
 */
export function enter(targets: Targets, options: { delay?: number; step?: number } = {}) {
  const { delay = 0, step = STAGGER_STEP } = options
  return motion(targets, {
    opacity: [0, 1],
    translateY: [8, 0],
    duration: duration.quick,
    ease: ease.out,
    delay: stagger(step, { start: delay }),
  })
}

/**
 * Counts a figure up to its new value, formatting each frame through the same
 * formatter the static label uses.
 *
 * Money is the whole point of this product, so the numbers are worth animating —
 * but only on a real change, and never from nothing on first paint unless asked,
 * because a dashboard that spins up every figure on every navigation is a toy.
 */
export function countUp(
  element: HTMLElement,
  options: {
    from: number
    to: number
    format: (value: number) => string
    duration?: number
  }
) {
  const { from, to, format } = options
  if (reducedMotion() || from === to) {
    element.textContent = format(to)
    return null
  }

  const state = { value: from }
  return animate(state, {
    value: to,
    duration: options.duration ?? duration.deliberate,
    ease: ease.out,
    onUpdate: () => {
      element.textContent = format(state.value)
    },
    onComplete: () => {
      // Guard against the last frame landing a hair short of the target.
      element.textContent = format(to)
    },
  })
}

/**
 * Draws an SVG path in, left to right. Used for sparklines, the deployment
 * chart and the score ring.
 *
 * Takes the drawable proxies from `svg.createDrawable(path)` — anime.js animates
 * their `draw` property, which it maps onto stroke-dasharray/offset.
 */
export function drawIn(drawables: Targets, options: { delay?: number; duration?: number } = {}) {
  return motion(drawables, {
    draw: '0 1',
    duration: options.duration ?? duration.deliberate,
    ease: ease.inOut,
    delay: options.delay ?? 0,
  })
}

/** A panel arriving from an edge, on a spring. `axis` is the edge it comes from. */
export function slideIn(targets: Targets, axis: 'left' | 'right' | 'bottom' = 'bottom') {
  const offset = { left: { translateX: [-16, 0] }, right: { translateX: [16, 0] }, bottom: { translateY: [16, 0] } }
  return motion(targets, {
    opacity: [0, 1],
    ...offset[axis],
    duration: duration.settled,
    ease: springs.panel,
  })
}

/** An overlay taking focus: scales up from 98% on a spring. */
export function overlayIn(targets: Targets) {
  return motion(targets, {
    opacity: [0, 1],
    scale: [0.98, 1],
    duration: duration.settled,
    ease: springs.panel,
  })
}

/**
 * A one-off attention pulse — a figure that just changed, a row that just
 * arrived from the server. Rings out from the element's own accent colour.
 */
export function pulse(targets: Targets) {
  return motion(targets, {
    scale: [
      { to: 1.015, duration: duration.instant, ease: ease.out },
      { to: 1, duration: duration.quick, ease: springs.subtle },
    ],
  })
}

/** A short shake for a rejected action. Horizontal only, and small. */
export function refuse(targets: Targets) {
  return motion(targets, {
    translateX: [
      { to: -4, duration: 60 },
      { to: 4, duration: 60 },
      { to: -2, duration: 60 },
      { to: 0, duration: 60 },
    ],
  })
}

/**
 * FLIP: remembers where a group's items are, and after the DOM re-orders them,
 * animates each from where it was to where it now is.
 *
 * This is what makes sorting a table legible — without it, rows teleport and the
 * eye has to re-find the row it was reading.
 *
 * ```ts
 * const flip = captureOrder(rows)   // before setState
 * setSort('amount')                 // React re-orders
 * useEffect(() => flip.play(), [sort])
 * ```
 */
export function captureOrder(elements: ArrayLike<HTMLElement>) {
  if (reducedMotion()) return { play: () => {} }

  const before = new Map<HTMLElement, number>()
  for (const element of Array.from(elements)) {
    before.set(element, element.getBoundingClientRect().top)
  }

  return {
    play() {
      for (const [element, top] of before) {
        if (!element.isConnected) continue
        const delta = top - element.getBoundingClientRect().top
        if (Math.abs(delta) < 1) continue
        animate(element, {
          translateY: [delta, 0],
          duration: duration.settled,
          ease: ease.out,
        })
      }
    },
  }
}

/**
 * Runs a callback on a frame loop with anime.js's engine (one clock for the whole
 * app, paused when the tab is hidden) instead of a bare requestAnimationFrame.
 */
export function ticker(onTick: (elapsed: number) => void) {
  return createTimer({ onUpdate: (timer) => onTick(timer.currentTime) })
}

export { animate, stagger, utils }
