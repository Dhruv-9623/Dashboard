import type { ReactNode } from 'react'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Small facts about the page — counts, "updated 2 min ago", a status badge. */
  meta?: ReactNode
  className?: string
}

export const PageHeader = ({ title, description, actions, meta, className }: PageHeaderProps) => {
  useDocumentTitle(title)

  return (
    <div className={cn('mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3', className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* tabIndex -1 lets AppShell move focus here after navigation. */}
          <h1
            tabIndex={-1}
            className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-ink focus:outline-none sm:text-2xl"
          >
            {title}
          </h1>
          {meta}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/**
 * A row of filters and search above a table. Wraps to its own line on a phone
 * and keeps a consistent gap so every list page has the same control strip.
 */
export const PageToolbar = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div
    className={cn(
      'mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 shadow-card',
      className
    )}
  >
    {children}
  </div>
)
