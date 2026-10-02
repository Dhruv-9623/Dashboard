import React from 'react'
import { cn } from '@/lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('mb-1.5 block text-sm font-medium text-ink-secondary', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-negative" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
)

Label.displayName = 'Label'

export const FieldHint = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mt-1.5 text-xs text-muted', className)} {...props} />
)

export const FieldError = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('mt-1.5 text-xs text-negative', className)} {...props} />
)
