import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes the shadow, for cards nested inside another surface. */
  flat?: boolean
}

/**
 * The standard surface: hairline border, 12px radius, one soft shadow.
 *
 * There is deliberately one card style. The earlier UI had shadowed and flat
 * cards on the same page, which reads as two different systems.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, flat, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-line bg-surface',
        flat ? 'shadow-none' : 'shadow-card',
        className
      )}
      {...props}
    />
  )
)

Card.displayName = 'Card'

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5',
        className
      )}
      {...props}
    />
  )
)

CardHeader.displayName = 'CardHeader'

/**
 * A card's title. Deliberately small — a card heading competes with the page
 * heading otherwise, and there are often six on a page.
 */
export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-sm font-semibold tracking-[-0.01em] text-ink', className)}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 py-4', className)} {...props} />
  )
)

CardContent.displayName = 'CardContent'

/** A quieter strip at the bottom of a card, for totals or a "view all" link. */
export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between gap-3 rounded-b-xl border-t border-line bg-surface-sunken px-5 py-3 text-[13px] text-ink-secondary',
        className
      )}
      {...props}
    />
  )
)

CardFooter.displayName = 'CardFooter'
