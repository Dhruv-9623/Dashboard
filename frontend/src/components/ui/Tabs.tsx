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
}

export const Tabs = ({ items, value, onChange, className }: TabsProps) => (
  <div className={cn('flex gap-1 border-b border-gray-200', className)} role="tablist">
    {items.map((item) => {
      const active = item.value === value
      return (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={active}
          onClick={() => onChange(item.value)}
          className={cn(
            '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            active
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-semibold',
                active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      )
    })}
  </div>
)
