import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DotsIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export interface RowAction {
  label: string
  onSelect: () => void
  /** Renders as a link instead of a button — keeps "open in new tab" working. */
  to?: string
  icon?: ReactNode
  destructive?: boolean
}

interface RowActionsProps {
  /** The accessible name, e.g. "Actions for Ledgerly" — several of these share a page. */
  label: string
  actions: RowAction[]
}

/**
 * The per-row `⋯` menu.
 *
 * Replaces inline Edit/Remove buttons in table rows, which cost two 32px targets
 * per row (below the 44px minimum on touch), put a destructive action one stray
 * tap away, and added visual weight to every row for actions used on one.
 */
export const RowActions = ({ label, actions }: RowActionsProps) => {
  const destructive = actions.filter((action) => action.destructive)
  const regular = actions.filter((action) => !action.destructive)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors',
            'hover:bg-surface-hover hover:text-ink',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45',
            // Visible on hover or keyboard focus, and always on touch, where there
            // is no hover to reveal it.
            'opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-sm:opacity-100'
          )}
        >
          <DotsIcon className="size-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {regular.map((action) =>
          action.to ? (
            <DropdownMenuItem key={action.label} asChild>
              <Link to={action.to} className="flex items-center gap-2">
                {action.icon}
                {action.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem key={action.label} onSelect={action.onSelect}>
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          )
        )}
        {destructive.length > 0 && regular.length > 0 && <DropdownMenuSeparator />}
        {destructive.map((action) => (
          <DropdownMenuItem key={action.label} variant="destructive" onSelect={action.onSelect}>
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
