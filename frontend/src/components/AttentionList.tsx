import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ChevronRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useEntrance } from '@/lib/useMotion'

export interface AttentionItem {
  id: string
  to: string
  icon: ReactNode
  title: string
  meta: string
  tone?: 'default' | 'brand' | 'notice'
}

interface AttentionListProps {
  title: string
  items: AttentionItem[]
  emptyMessage: string
  className?: string
}

const tones = {
  default: '',
  brand: 'before:bg-brand',
  notice: 'before:bg-notice',
} as const

/**
 * The dashboard's working list: things that are waiting on the person reading.
 *
 * This replaces a row of navigation tiles. Tiles tell you where the product's
 * features live, which you only need once; this tells you what to do today,
 * which is why anyone opens a dashboard twice.
 */
export const AttentionList = ({ title, items, emptyMessage, className }: AttentionListProps) => {
  const listRef = useEntrance<HTMLUListElement>(items.length)

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {items.length > 0 && (
          <span className="label-micro tabular">{items.length} waiting</span>
        )}
      </CardHeader>
      <CardContent className="p-2">
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-ink-muted">{emptyMessage}</p>
        ) : (
          <ul ref={listRef}>
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    'hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
                    // A left tick marks priority without colouring the whole row.
                    'before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r',
                    tones[item.tone ?? 'default']
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-sunken text-ink-muted">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                    <span className="block truncate text-xs text-ink-muted">{item.meta}</span>
                  </span>
                  <ChevronRightIcon
                    className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
