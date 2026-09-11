import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { suggestionApi, suggestionKeys } from './api'
import { SuggestionStatus, SuggestionType } from './types'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { SparkIcon } from '@/components/icons'
import { stageLabel } from '@/lib/constants'

export const SuggestionsPage = () => {
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: suggestionKeys.all, queryFn: suggestionApi.list })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SuggestionStatus }) =>
      suggestionApi.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suggestionKeys.all }),
  })

  const regenerate = useMutation({
    mutationFn: suggestionApi.regenerate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: suggestionKeys.all }),
  })

  const pending = (query.data ?? []).filter(
    (suggestion) => suggestion.status === SuggestionStatus.PENDING
  )

  return (
    <>
      <PageHeader
        title="AI Suggestions"
        description="Matches generated from your profile, portfolio, and stated preferences."
        actions={
          <Button
            variant="outline"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
          >
            <SparkIcon className="mr-2 h-4 w-4" />
            {regenerate.isPending ? 'Queued…' : 'Regenerate'}
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<SparkIcon className="h-6 w-6" />}
          title="No suggestions right now"
          description="Suggestions are generated asynchronously. Regenerate to queue a fresh pass."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pending.map((suggestion) => {
            const href =
              suggestion.suggestionType === SuggestionType.STARTUP_FOR_VC
                ? `/startups/${suggestion.targetId}`
                : `/firms/${suggestion.targetId}`

            return (
              <Card key={suggestion.id}>
                <CardContent className="py-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={suggestion.targetName} logoUrl={suggestion.targetLogoUrl} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to={href}
                        className="block truncate font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                      >
                        {suggestion.targetName}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {suggestion.targetSector ?? '—'}
                        {suggestion.targetStage ? ` · ${stageLabel(suggestion.targetStage)}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-gray-900">
                      {Math.round(suggestion.score * 100)}%
                    </span>
                  </div>

                  <Progress className="mt-3" value={suggestion.score * 100} tone="blue" />

                  <p className="mt-3 text-sm leading-relaxed text-gray-700">
                    {suggestion.reasoning}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <Link to={href} className="flex-1">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          setStatus.mutate({
                            id: suggestion.id,
                            status: SuggestionStatus.ACTIONED,
                          })
                        }
                      >
                        View profile
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setStatus.mutate({
                          id: suggestion.id,
                          status: SuggestionStatus.DISMISSED,
                        })
                      }
                      disabled={setStatus.isPending}
                    >
                      Dismiss
                    </Button>
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
