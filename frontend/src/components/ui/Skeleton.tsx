import { cn } from '@/lib/utils'

/**
 * A loading placeholder. The sheen sweeps rather than pulses: a pulse makes a
 * whole page throb, while a sweep reads as "content is on its way" and keeps the
 * eye moving in the direction the text will fill.
 *
 * motion-safe: both the sweep and any pulse stop under reduced motion, leaving a
 * plain block.
 */
export const Skeleton = ({ className }: { className?: string }) => (
  <div
    aria-hidden="true"
    className={cn(
      'relative overflow-hidden rounded-md bg-surface-sunken',
      'motion-safe:after:absolute motion-safe:after:inset-0',
      'motion-safe:after:bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--ink)_6%,transparent),transparent)]',
      'motion-safe:after:animate-[skeleton-sweep_1.6s_ease-in-out_infinite]',
      className
    )}
  />
)

export const SkeletonRows = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} className="h-12 w-full" />
    ))}
  </div>
)

/**
 * A skeleton shaped like the page it stands in for: a title, a figure row and a
 * body block. A single grey rectangle tells the reader nothing about what is
 * coming; this keeps the layout from jumping when the data lands.
 */
export const SkeletonDetail = () => (
  <div className="space-y-4" role="status" aria-label="Loading">
    <Skeleton className="h-7 w-64" />
    <div className="grid gap-3 sm:grid-cols-3">
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
    <Skeleton className="h-40" />
  </div>
)
