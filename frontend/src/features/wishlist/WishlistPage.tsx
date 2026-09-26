import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { wishlistApi, wishlistKeys } from './api'
import { WishlistTargetType } from './types'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { HeartIcon, TrashIcon } from '@/components/icons'
import { formatDate, stageLabel } from '@/lib/constants'

export const WishlistPage = () => {
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: wishlistKeys.all, queryFn: wishlistApi.list })

  const remove = useMutation({
    mutationFn: (id: string) => wishlistApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: wishlistKeys.all }),
  })

  const items = query.data ?? []

  return (
    <>
      <PageHeader
        title="Wishlist"
        description="Saved profiles you want to revisit. Only you can see this list."
      />

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HeartIcon className="h-6 w-6" />}
          title="Nothing saved yet"
          description="Tap the heart on any profile in Discover to save it here."
          action={
            <Link to="/discover" className={buttonClass()}>
              Go to Discover
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const href =
              item.targetType === WishlistTargetType.STARTUP
                ? `/startups/${item.targetId}`
                : `/firms/${item.targetId}`

            return (
              <Card key={item.id}>
                <CardContent className="py-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={item.targetName} logoUrl={item.targetLogoUrl} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={href}
                        className="block truncate font-semibold text-ink hover:text-brand-ink hover:underline"
                      >
                        {item.targetName}
                      </Link>
                      <p className="text-xs text-ink-muted">
                        {item.targetSector ?? '—'}
                        {item.targetStage ? ` · ${stageLabel(item.targetStage)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.targetName} from wishlist`}
                      title="Remove from wishlist"
                      onClick={() => remove.mutate(item.id)}
                      disabled={remove.isPending}
                      className="-m-1.5 inline-flex h-11 w-11 items-center justify-center rounded text-icon-muted transition-colors hover:bg-negative-subtle hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:m-0 lg:h-8 lg:w-8"
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  {item.note && <p className="mt-3 text-sm text-ink-secondary">{item.note}</p>}

                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary">
                      {item.targetType === WishlistTargetType.STARTUP ? 'Startup' : 'VC firm'}
                    </Badge>
                    <span className="text-xs text-ink-muted">Saved {formatDate(item.savedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
