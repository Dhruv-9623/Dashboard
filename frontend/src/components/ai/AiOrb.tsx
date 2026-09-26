import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { reducedMotion } from '@/lib/motion'

export type OrbState = 'idle' | 'thinking'

interface AiOrbProps {
  /** `thinking` while a model call is in flight; `idle` otherwise. */
  state?: OrbState
  /** Rendered size in px. Below ~72px the fluid detail is wasted — use the fallback. */
  size?: number
  className?: string
}

/**
 * The AI mark: a WebGPU liquid orb (public/ai-orb.html), shown wherever the
 * product is doing something a model did.
 *
 * Three things make this safe to put in a product rather than a demo:
 *
 *  - **It is decorative.** `aria-hidden`, no pointer events. Every surface that
 *    uses it states in text what is happening, so nothing depends on the orb.
 *  - **It is only mounted when it is on screen**, via IntersectionObserver.
 *    221k instances of ribbon geometry is not something to render behind a
 *    scrolled-past card.
 *  - **It always has a floor.** WebGPU is still absent from plenty of browsers,
 *    and `prefers-reduced-motion` rules it out regardless, so the CSS orb below
 *    is the default and the canvas replaces it only once it reports a frame.
 */
export const AiOrb = ({ state = 'idle', size = 96, className }: AiOrbProps) => {
  const frame = useRef<HTMLIFrameElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [live, setLive] = useState(false)

  const supported =
    typeof navigator !== 'undefined' && 'gpu' in navigator && !reducedMotion()

  // Mount the canvas only while the orb is actually in view.
  useEffect(() => {
    const element = host.current
    if (!element || !supported) return

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '96px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [supported])

  // The page reports back when it has queued its first frame, or failed.
  useEffect(() => {
    if (!visible) {
      setLive(false)
      return
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return
      const payload = event.data as { channel?: string; ready?: boolean } | null
      if (payload?.channel !== 'ai-orb') return
      setLive(Boolean(payload.ready))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [visible])

  // Drive idle ⇄ thinking. The page cross-fades its own uniforms over ~220ms in
  // and ~650ms out, so this is just a state handoff.
  useEffect(() => {
    if (!live) return
    frame.current?.contentWindow?.postMessage({ channel: 'ai-orb', state }, '*')
  }, [state, live])

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={cn('relative shrink-0 overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
    >
      {/* Floor: a CSS orb that is always present. Conic sweep for the liquid
          feel, blurred radial core for depth. It animates through CSS only, so
          it costs nothing next to the canvas. */}
      <div
        className={cn(
          'absolute inset-0 rounded-full transition-opacity duration-700',
          live ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 rounded-full opacity-90',
            'bg-[conic-gradient(from_180deg,var(--viz-1),var(--viz-3),var(--viz-5),var(--viz-2),var(--viz-1))]',
            'motion-safe:animate-[spin_9s_linear_infinite]',
            state === 'thinking' && 'motion-safe:animate-[spin_2.6s_linear_infinite]'
          )}
        />
        <div className="absolute inset-[14%] rounded-full bg-[radial-gradient(circle_at_32%_28%,rgb(255_255_255/0.95),transparent_58%)] blur-[2px]" />
        <div className="absolute inset-0 rounded-full shadow-[inset_0_0_18px_4px_rgb(255_255_255/0.28),inset_0_-8px_20px_0_rgb(18_20_26/0.22)]" />
        {state === 'thinking' && (
          <div className="absolute inset-0 rounded-full ring-2 ring-brand/30 motion-safe:animate-pulse" />
        )}
      </div>

      {visible && supported && (
        <iframe
          ref={frame}
          src="/ai-orb.html"
          title=""
          tabIndex={-1}
          scrolling="no"
          className={cn(
            'pointer-events-none absolute inset-0 size-full rounded-full border-0 transition-opacity duration-700',
            live ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  )
}

/**
 * The same mark at button size, for a toolbar or a list row. Pure CSS — at 20px
 * a WebGPU context buys nothing.
 */
export const AiMark = ({ className, busy }: { className?: string; busy?: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      'relative inline-block size-5 shrink-0 overflow-hidden rounded-full',
      'bg-[conic-gradient(from_180deg,var(--viz-1),var(--viz-3),var(--viz-5),var(--viz-2),var(--viz-1))]',
      busy ? 'motion-safe:animate-[spin_1.4s_linear_infinite]' : 'motion-safe:animate-[spin_7s_linear_infinite]',
      className
    )}
  >
    <span className="absolute inset-[22%] rounded-full bg-[radial-gradient(circle_at_34%_30%,rgb(255_255_255/0.9),transparent_60%)]" />
  </span>
)
