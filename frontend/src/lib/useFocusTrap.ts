import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// React's autoFocus moves focus into a dialog before effects run, so by then document.activeElement
// is no longer the trigger. Remember the last two focus targets to find what to restore.
let currentFocus: Element | null = null
let previousFocus: Element | null = null
if (typeof document !== 'undefined') {
  document.addEventListener(
    'focusin',
    (event) => {
      previousFocus = currentFocus
      currentFocus = event.target as Element
    },
    true
  )
}

/**
 * Dialog focus management (WCAG 2.4.3): while `active`, moves focus into the container, keeps Tab
 * and Shift+Tab inside it, calls `onEscape` on Escape, and returns focus to whatever was focused
 * before it opened.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void
) {
  // Keep the latest callback without re-running the effect (and re-stealing focus) on every render.
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const focusAlreadyInside = container.contains(document.activeElement)
    const previouslyFocused = (
      focusAlreadyInside ? previousFocus : document.activeElement
    ) as HTMLElement | null

    const focusables = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement
      )

    // Respect a field React already autofocused; otherwise first focusable, then the container itself.
    if (!focusAlreadyInside) {
      const initial = container.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? container
      initial.focus()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onEscapeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement

      if (event.shiftKey && (current === first || !container.contains(current))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || !container.contains(current))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      // Restore focus to the trigger if it's still on the page.
      if (previouslyFocused && document.contains(previouslyFocused) && !container.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [active, containerRef])
}
