import React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  /** A leading status dot — for lifecycle states (Active, Open, Exited). */
  dot?: boolean
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-brand-subtle text-brand-ink border-brand-line',
  secondary: 'bg-surface-sunken text-ink-secondary border-line',
  success: 'bg-positive-subtle text-positive border-[color-mix(in_oklab,var(--positive)_22%,transparent)]',
  warning: 'bg-notice-subtle text-notice border-[color-mix(in_oklab,var(--notice)_22%,transparent)]',
  danger: 'bg-negative-subtle text-negative border-[color-mix(in_oklab,var(--negative)_22%,transparent)]',
  info: 'bg-info-subtle text-info border-[color-mix(in_oklab,var(--info)_22%,transparent)]',
  outline: 'bg-transparent text-ink-secondary border-line-strong',
}

/**
 * A status or category label.
 *
 * Squarer than the old pill (6px, not fully rounded) so it reads as metadata
 * rather than a button, with a hairline border that keeps the subtle fills from
 * disappearing on a tinted row.
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', dot, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  )
)

Badge.displayName = 'Badge'
