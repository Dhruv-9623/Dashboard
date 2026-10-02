import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * Field styling shared by Input, Textarea and Select, so the three never drift.
 * `aria-invalid` is the styling hook for validation errors — set it from
 * `useFieldErrors().a11y(...)` rather than passing a red border by hand.
 */
export const fieldClass =
  'w-full rounded-md border border-line-strong bg-surface text-ink shadow-[inset_0_1px_1px_0_rgb(18_20_26/0.03)] ' +
  'placeholder:text-ink-muted ' +
  'transition-[border-color,box-shadow] duration-150 ' +
  'hover:border-[color-mix(in_oklab,var(--line-strong)_70%,var(--ink))] ' +
  'focus-visible:outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/20 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60 ' +
  'aria-invalid:border-negative aria-invalid:ring-[3px] aria-invalid:ring-negative/15'

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        fieldClass,
        // 40px, 44px on phones. 14px text: 16px would avoid iOS zoom but reads
        // oversized in a dense form, and the viewport meta already prevents it.
        'h-10 px-3 text-sm max-sm:h-11',
        // Date and number inputs keep their figures aligned with the tables.
        'tabular',
        className
      )}
      {...props}
    />
  )
)

Input.displayName = 'Input'
