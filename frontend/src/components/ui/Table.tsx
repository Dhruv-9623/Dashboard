import React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon } from '@/components/icons'

/**
 * Dense data table, built for columns of money.
 *
 * Conventions, following the CRM and portfolio tools this product sits beside
 * (Attio, Twenty, Monarch, Quicken):
 *   - the header row is a sticky, quiet band of micro-labels, not a grey slab
 *   - numeric columns are right-aligned with tabular figures, so digits line up
 *   - rows are 48px with a hairline divider and a whole-row hover
 *   - a footer row carries aggregates ("3 holdings · ₹35.00 Cr"), which is what
 *     people actually scan a portfolio table for
 *
 * Under 640px a table this wide can't reflow honestly, so pages render the same
 * data through <TableCardList> instead.
 */
export const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="scrollbar-slim w-full overflow-x-auto overscroll-x-contain">
      <table
        ref={ref}
        className={cn('w-full caption-bottom border-separate border-spacing-0 text-sm', className)}
        {...props}
      />
    </div>
  )
)

Table.displayName = 'Table'

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('sticky top-0 z-10 bg-surface/95 backdrop-blur-sm', className)} {...props} />
)

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={className} {...props} />
)

export const TableFooter = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tfoot
    className={cn(
      'bg-surface-sunken [&_td]:border-t [&_td]:border-line [&_td]:py-2.5 [&_td]:text-[13px] [&_td]:text-ink-secondary',
      className
    )}
    {...props}
  />
)

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean
}

export const TableRow = ({ className, selected, ...props }: TableRowProps) => (
  <tr
    data-selected={selected || undefined}
    className={cn(
      'group/row transition-colors',
      '[&>td]:border-b [&>td]:border-line',
      props.onClick && 'cursor-pointer',
      'hover:[&>td]:bg-surface-hover',
      // A hairline of the brand colour on the leading edge under the pointer:
      // enough to hold the eye's place across a wide row, no layout shift.
      'hover:[&>td:first-child]:shadow-[inset_2px_0_0_0_color-mix(in_oklab,var(--brand)_45%,transparent)]',
      // A left accent marks the selected row without tinting the whole surface,
      // which would fight the status pills inside it.
      selected && '[&>td]:bg-brand-subtle [&>td:first-child]:shadow-[inset_2px_0_0_0_var(--brand)]',
      className
    )}
    {...props}
  />
)

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Right-align and use tabular figures — for money, percentages and counts. */
  numeric?: boolean
}

export const TableHead = ({ className, numeric, ...props }: TableHeadProps) => (
  <th
    scope="col"
    className={cn(
      'label-micro border-b border-line bg-surface-sunken/60 px-4 py-2.5 text-left font-medium whitespace-nowrap',
      numeric && 'text-right',
      className
    )}
    {...props}
  />
)

export type SortDirection = 'asc' | 'desc'

interface SortableHeadProps extends TableHeadProps {
  /** True when the table is currently sorted by this column. */
  active?: boolean
  direction?: SortDirection
  onSort: () => void
}

/** A column header that sorts. Announces its state, so it works from the keyboard. */
export const SortableHead = ({
  active,
  direction = 'desc',
  onSort,
  numeric,
  className,
  children,
  ...props
}: SortableHeadProps) => (
  <TableHead
    numeric={numeric}
    aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    className={cn('p-0', className)}
    {...props}
  >
    <button
      type="button"
      onClick={onSort}
      className={cn(
        'label-micro flex w-full items-center gap-1 px-4 py-2.5 transition-colors hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/45',
        numeric && 'justify-end',
        active && 'text-ink'
      )}
    >
      {numeric && (
        <ChevronDownIcon
          className={cn(
            'size-3 transition-transform',
            active ? 'opacity-100' : 'opacity-0 group-hover/head:opacity-40',
            direction === 'asc' && 'rotate-180'
          )}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
      {!numeric && (
        <ChevronDownIcon
          className={cn(
            'size-3 transition-transform',
            active ? 'opacity-100' : 'opacity-0 group-hover/head:opacity-40',
            direction === 'asc' && 'rotate-180'
          )}
          aria-hidden="true"
        />
      )}
    </button>
  </TableHead>
)

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  numeric?: boolean
  /** Quieter text, for secondary or placeholder values. */
  muted?: boolean
}

export const TableCell = ({ className, numeric, muted, ...props }: TableCellProps) => (
  <td
    className={cn(
      'h-12 px-4 align-middle text-[13px] text-ink',
      numeric && 'text-right tabular whitespace-nowrap',
      muted && 'text-ink-muted',
      className
    )}
    {...props}
  />
)

/** Wraps the table in the standard bordered, rounded surface. */
export const TableSurface = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'overflow-hidden rounded-xl border border-line bg-surface shadow-card',
      // The last row's divider would double up with the container border.
      '[&_tbody_tr:last-child>td]:border-b-0',
      className
    )}
    {...props}
  />
)

/** The phone-width counterpart to a table: one card per row. */
export const TableCardList = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('space-y-2 sm:hidden', className)} {...props} />
  )
)

TableCardList.displayName = 'TableCardList'

export const TableCard = ({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
  <li
    className={cn('rounded-xl border border-line bg-surface p-4 shadow-card', className)}
    {...props}
  />
)

/** A label/value pair inside a TableCard. */
export const TableCardField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="label-micro">{label}</p>
    <p className="mt-0.5 truncate text-[13px] tabular text-ink">{children}</p>
  </div>
)
