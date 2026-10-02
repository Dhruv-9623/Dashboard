import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface PaginationProps {
  /** Zero-based, as returned by the API. */
  page: number
  totalPages: number
  totalElements: number
  size: number
  onPageChange: (page: number) => void
  className?: string
  /** Noun for the count line, e.g. "investments". */
  label?: string
}

/** Previous/next paging with a "Showing 21–40 of 57" line. Renders nothing for a single page. */
export const Pagination = ({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
  className,
  label = 'results',
}: PaginationProps) => {
  if (totalPages <= 1) return null

  const first = page * size + 1
  const last = Math.min((page + 1) * size, totalElements)

  return (
    <nav
      aria-label="Pagination"
      className={cn('mt-4 flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-sm text-muted" aria-live="polite">
        Showing <span className="font-medium text-ink">{first}–{last}</span> of{' '}
        <span className="font-medium text-ink">{totalElements}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page === 0}>
          Previous
        </Button>
        <span className="text-sm text-muted">
          Page {page + 1} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}
