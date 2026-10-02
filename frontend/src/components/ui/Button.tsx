import React from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap ' +
  'transition-[background-color,border-color,box-shadow,transform] duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ' +
  'disabled:pointer-events-none disabled:opacity-50 ' +
  // A 1px press is enough to feel physical without moving the layout.
  'active:translate-y-px ' +
  "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

const variants: Record<ButtonVariant, string> = {
  // The inner top highlight is what separates a solid button from a coloured
  // rectangle; it reads as a raised surface at any size.
  primary:
    'bg-brand text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.16),var(--shadow-card)] hover:bg-brand-hover',
  secondary: 'bg-surface-sunken text-ink border border-line hover:bg-surface-hover hover:border-line-strong',
  outline: 'border border-line-strong bg-surface text-ink shadow-card hover:bg-surface-hover',
  ghost: 'text-ink-secondary hover:bg-surface-hover hover:text-ink',
  danger: 'bg-negative text-white hover:brightness-110',
}

const sizes: Record<ButtonSize, string> = {
  // 36/40/44px. Every size keeps a 44px touch target on small screens, which
  // is why the min-h override is here rather than on individual call sites.
  sm: 'h-9 px-3 text-[13px] max-sm:min-h-11',
  md: 'h-10 px-4 text-sm max-sm:min-h-11',
  lg: 'h-11 px-5 text-[15px]',
  icon: 'size-10 p-0 max-sm:size-11',
  // Only for controls inside an overlay's own chrome, such as a dialog's close
  // button, where a 44px target would crowd the title.
  'icon-sm': 'size-8 p-0',
}

/**
 * Button styling for elements that must stay links (router <Link>, external <a>).
 * Use this instead of nesting <Button> inside a link, which creates two tab stops for one action.
 */
export const buttonClass = ({
  variant = 'primary',
  size = 'md',
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) =>
  cn(baseStyles, variants[variant], sizes[size], className)

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClass({ variant, size, className })} {...props} />
  )
)

Button.displayName = 'Button'
