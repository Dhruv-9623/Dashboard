import { cn } from '@/lib/utils'

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded bg-gray-200', className)} />
)

export const SkeletonRows = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, index) => (
      <Skeleton key={index} className="h-14 w-full" />
    ))}
  </div>
)
