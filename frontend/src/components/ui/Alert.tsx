import React from 'react'
import { cn } from '@/lib/utils'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
}

const variants = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-green-200 bg-green-50 text-green-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
}

export const Alert = ({ className, variant = 'info', title, children, ...props }: AlertProps) => (
  <div className={cn('rounded-lg border p-4', variants[variant], className)} {...props}>
    {title && <p className="mb-1 text-sm font-semibold">{title}</p>}
    {children && <div className="text-sm">{children}</div>}
  </div>
)
