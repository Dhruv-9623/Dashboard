import React from 'react'
import { cn } from '@/lib/utils'
import { fieldClass } from './Input'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldClass, 'block px-3 py-2.5 text-sm leading-relaxed resize-y', className)}
      {...props}
    />
  )
)

Textarea.displayName = 'Textarea'
