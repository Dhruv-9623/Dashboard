import { useEffect, useId, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { motion, overlayIn, duration, ease } from '@/lib/motion'
import { Button } from './Button'
import { XIcon } from '@/components/icons'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  /** Wider layout for forms with side-by-side fields. */
  size?: 'md' | 'lg'
}

export const Modal = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = 'md',
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const scrimRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useFocusTrap(dialogRef, open, onClose)

  // The dialog springs up as the scrim fades: the overshoot is what makes it
  // feel summoned rather than switched on.
  useEffect(() => {
    if (!open) return
    const panel = dialogRef.current
    const scrim = scrimRef.current
    if (!panel) return
    const panelIn = overlayIn(panel)
    const scrimIn = scrim
      ? motion(scrim, { opacity: [0, 1], duration: duration.quick, ease: ease.out })
      : null
    return () => {
      panelIn?.revert()
      scrimIn?.revert()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        ref={scrimRef}
        className="absolute inset-0 bg-[rgb(10_12_18/0.5)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'scrollbar-slim relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden',
          // On a phone it's a sheet from the bottom; on a desktop, a centred dialog.
          'rounded-t-2xl sm:rounded-2xl',
          'border border-line bg-surface shadow-overlay focus:outline-none',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
          className
        )}
      >
        {/* The grab handle reads as "this sheet can be dismissed" on touch. */}
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" />

        <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-[13px] leading-relaxed text-ink-secondary">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="scrollbar-slim flex-1 overflow-y-auto border-t border-line px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <div className="flex justify-end gap-2 border-t border-line bg-surface-sunken px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
