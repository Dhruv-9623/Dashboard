import React from 'react'
import { cn } from '@/lib/utils'

export const Table = ({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto">
    <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
)

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn('border-b border-gray-200 bg-gray-50', className)} {...props} />
)

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn('divide-y divide-gray-200', className)} {...props} />
)

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean
}

export const TableRow = ({ className, selected, ...props }: TableRowProps) => (
  <tr
    className={cn(
      'transition-colors',
      props.onClick && 'cursor-pointer hover:bg-gray-50',
      selected && 'bg-blue-50 hover:bg-blue-50',
      className
    )}
    {...props}
  />
)

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500',
      className
    )}
    {...props}
  />
)

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3 align-middle text-gray-900', className)} {...props} />
)
