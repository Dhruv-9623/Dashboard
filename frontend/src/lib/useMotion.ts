import { useEffect, useLayoutEffect, useRef } from 'react'
import { createAnimatable, onScroll, scrambleText, splitText, svg, utils } from 'animejs'
import { captureOrder, drawIn, duration, ease, enter, motion, reducedMotion, stagger } from './motion'

/**
 * React bindings for the motion layer.
 *
 * Every hook here cleans up after itself, and every one is a no-op under
 * `prefers-reduced-motion` (the underlying helpers apply the end state instead).
 */

/**
 * Staggered entrance for the direct children of a container, on mount and
 * whenever `key` changes (a new page of results, a different filter).
 *
 * ```tsx
 * const grid = useEntrance<HTMLDivElement>(page)
 * <div ref={grid}>{items.map(...)}</div>
 * ```
 */
export function useEntrance<T extends HTMLElement>(key?: unknown, selector = ':scope > *') {
  const ref = useRef<T>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const children = container.querySelectorAll<HTMLElement>(selector)
    if (children.length === 0) return
    const animation = enter(Array.from(children))
    return () => {
      animation?.revert()
    }
  }, [key, selector])

  return ref
}

/**
 * Animates a figure to its new value. Formats through `format` so the element
 * always shows a real, localised figure — never a raw float mid-flight.
 *
 * Skips the very first render by default: a dashboard shouldn't count every
 * number up each time you navigate back to it. Pass `animateOnMount` for a
 * surface where the reveal is the point, such as the signed-in landing.
 */
export function useCountUp(
  value: number,
  format: (value: number) => string,
  options: { animateOnMount?: boolean } = {}
) {
  const ref = useRef<HTMLElement>(null)
  const previous = useRef<number | null>(options.animateOnMount ? 0 : null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const from = previous.current
    previous.current = value

    if (from === null || from === value || reducedMotion()) {
      element.textContent = format(value)
      return
    }

    const state = { value: from }
    const animation = motion(state as unknown as HTMLElement, {
      value,
      duration: duration.deliberate,
      ease: ease.out,
      onUpdate: () => {
        element.textContent = format(state.value)
      },
      onComplete: () => {
        element.textContent = format(value)
      },
    })
    return () => {
      animation?.revert()
    }
    // `format` is a new closure every render; the value is what should retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return ref
}

/**
 * Draws every `<path>` inside an SVG in, once, when it first appears.
 * For sparklines, the deployment chart and the score ring.
 */
export function useDrawIn<T extends SVGSVGElement>(key?: unknown, delay = 0) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const paths = root.querySelectorAll<SVGPathElement>('path[data-draw]')
    if (paths.length === 0) return

    // createDrawable turns each path into a proxy with an animatable `draw`
    // property ("start end", both 0–1), which it maps onto the dash offset.
    const drawables = svg.createDrawable(paths)
    utils.set(drawables, { draw: '0 0' })
    const animation = drawIn(drawables, { delay })
    return () => {
      animation?.revert()
    }
  }, [key, delay])

  return ref
}

/**
 * Reveals an element when it scrolls into view — used on the long analytical
 * pages, where everything below the fold would otherwise animate at once while
 * nobody is looking at it.
 */
export function useScrollReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || reducedMotion()) return

    const animation = motion(element, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: duration.settled,
      ease: ease.out,
      autoplay: onScroll({ target: element, enter: 'bottom-=48 top' }),
    })
    return () => {
      animation?.revert()
    }
  }, [])

  return ref
}

/**
 * A light source that follows the pointer across a surface, damped so it trails
 * rather than snaps. Sets `--glow-x` / `--glow-y` (percentages) for CSS to use.
 *
 * Reserved for one hero surface per page — on everything else it's noise.
 */
export function usePointerGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || reducedMotion()) return

    // createAnimatable gives each property its own spring-damped setter, which is
    // what keeps the highlight from jittering with the raw pointer samples.
    const glow = createAnimatable(element, {
      '--glow-x': { unit: '%', duration: 320, ease: ease.out },
      '--glow-y': { unit: '%', duration: 320, ease: ease.out },
    })

    const onPointerMove = (event: PointerEvent) => {
      const box = element.getBoundingClientRect()
      glow['--glow-x'](((event.clientX - box.left) / box.width) * 100)
      glow['--glow-y'](((event.clientY - box.top) / box.height) * 100)
    }
    const onPointerLeave = () => {
      glow['--glow-x'](50)
      glow['--glow-y'](0)
    }

    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerleave', onPointerLeave)
    return () => {
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerleave', onPointerLeave)
      glow.revert()
    }
  }, [])

  return ref
}

/**
 * FLIP for a list whose order changes: call with the value that drives the order
 * (a sort key, a filter) and rows glide from their old positions to their new
 * ones instead of teleporting.
 */
export function useOrderTransition<T extends HTMLElement>(order: unknown, selector = 'tbody > tr') {
  const ref = useRef<T>(null)
  const pending = useRef<{ play: () => void } | null>(null)
  const first = useRef(true)

  // Captured in the layout phase before React paints the new order…
  useLayoutEffect(() => {
    const container = ref.current
    if (!container || first.current) return
    pending.current = captureOrder(container.querySelectorAll<HTMLElement>(selector))
  }, [order, selector])

  // …and played once the new order is on screen.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    pending.current?.play()
    pending.current = null
  }, [order])

  return ref
}

/**
 * Reveals text a word at a time. Used for AI-written prose (a suggestion's
 * reasoning, a signal summary), where it reads as the sentence being composed
 * rather than a block appearing.
 */
export function useWordReveal<T extends HTMLElement>(content: string) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || !content || reducedMotion()) return

    const split = splitText(element, { words: true, chars: false })
    const animation = motion(split.words, {
      opacity: [0, 1],
      translateY: [6, 0],
      filter: ['blur(3px)', 'blur(0px)'],
      duration: duration.quick,
      // 18ms a word: the sentence reads as it lands, rather than after it.
      delay: stagger(18),
      ease: ease.out,
    })

    return () => {
      animation?.revert()
      split.revert()
    }
  }, [content])

  return ref
}

/**
 * Scrambles through characters before settling on the final string — the
 * conventional "a model is working on this" treatment. Only for AI output.
 */
export function useScramble<T extends HTMLElement>(content: string, active = true) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (!active || reducedMotion()) {
      element.textContent = content
      return
    }

    // `text` is an animatable property in anime.js 4.5; scrambleText supplies the
    // per-frame value, cycling glyphs under a reveal wave that moves left to right.
    const animation = motion(element, {
      text: scrambleText({
        text: content,
        chars: 'A-Z0-9',
        revealRate: 90,
        settleDuration: 220,
        cursor: '_',
      }),
      duration: duration.settled,
      ease: ease.out,
    })
    return () => {
      animation?.revert()
    }
  }, [content, active])

  return ref
}
