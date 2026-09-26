import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface TabItem {
  value: string
  label: string
  count?: number
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
  /** Accessible name for the tab list, e.g. "Investment status". */
  label?: string
}

/**
 * ARIA tabs with roving focus: Tab enters/leaves the list, arrow keys (and Home/End) move between
 * tabs and select them. The row scrolls horizontally instead of widening the page on small screens.
 */
export const Tabs = ({ items, value, onChange, className, label }: TabsProps) => {
  const listRef = useRef<HTMLDivElement>(null)

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.value === value)
    let next: number | null = null
    if (event.key === 'ArrowRight') next = (index + 1) % items.length
    if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = items.length - 1
    if (next === null) return

    event.preventDefault()
    onChange(items[next].value)
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex w-max min-w-full gap-1 border-b border-line"
      >
        {items.map((item) => {
          const active = item.value === value
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.value)}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand',
                active
                  ? 'border-brand text-brand-ink'
                  : 'border-transparent text-ink-secondary hover:border-line-strong hover:text-ink'
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    active ? 'bg-brand-subtle text-brand-ink' : 'bg-surface-hover text-ink-secondary'
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
