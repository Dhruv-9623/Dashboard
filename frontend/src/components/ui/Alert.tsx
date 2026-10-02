import React from 'react'
import { cn } from '@/lib/utils'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger'
  title?: string
}

const variants = {
  info: 'border-brand-line bg-brand-subtle text-brand-ink',
  success: 'border-[color-mix(in_oklab,var(--positive)_25%,transparent)] bg-positive-subtle text-positive',
  warning: 'border-[color-mix(in_oklab,var(--notice)_25%,transparent)] bg-notice-subtle text-notice',
  danger: 'border-[color-mix(in_oklab,var(--negative)_25%,transparent)] bg-negative-subtle text-negative',
}

export const Alert = ({ className, variant = 'info', title, children, ...props }: AlertProps) => (
  <div className={cn('rounded-lg border p-4', variants[variant], className)} {...props}>
    {title && <p className="mb-1 text-sm font-semibold">{title}</p>}
    {children && <div className="text-sm">{children}</div>}
  </div>
)
