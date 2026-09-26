import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { suggestionApi, suggestionKeys } from './api'
import { SuggestionStatus, SuggestionType } from './types'
import type { AISuggestionDTO } from './types'
import { PageHeader } from '@/components/PageHeader'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { AiOrb } from '@/components/ai/AiOrb'
import { MatchScore } from '@/components/ai/MatchScore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button, buttonClass } from '@/components/ui/Button'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { SparkIcon } from '@/components/icons'
import { stageLabel } from '@/lib/constants'
import { useEntrance, usePointerGlow, useWordReveal } from '@/lib/useMotion'

/**
 * A suggestion's reasoning, revealed a word at a time.
 *
 * The model wrote this sentence; showing it compose reads as the machine
 * explaining itself, which is the difference between a score people trust and a
 * number they ignore.
 */
const Reasoning = ({ text }: { text: string }) => {
  const ref = useWordReveal<HTMLParagraphElement>(text)
  return (
    <p ref={ref} className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
      {text}
    </p>
  )
}

const SuggestionCard = ({
  suggestion,
  onView,
  onDismiss,
  dismissing,
}: {
  suggestion: AISuggestionDTO
  onView: () => void
  onDismiss: () => void
  dismissing: boolean
}) => {
  const href =
    suggestion.suggestionType === SuggestionType.STARTUP_FOR_VC
      ? `/startups/${suggestion.targetId}`
      : `/firms/${suggestion.targetId}`

  return (
    <Card className="group/card relative overflow-hidden transition-shadow hover:shadow-raised">
      <CardContent>
        <div className="flex items-start gap-3">
          <EntityAvatar name={suggestion.targetName} logoUrl={suggestion.targetLogoUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <Link
              to={href}
              className="block truncate text-sm font-semibold text-ink hover:text-brand-ink hover:underline"
            >
              {suggestion.targetName}
            </Link>
            <p className="mt-0.5 truncate text-xs text-ink-muted">
              {suggestion.targetSector ?? '—'}
              {suggestion.targetStage ? ` · ${stageLabel(suggestion.targetStage)}` : ''}
            </p>
          </div>
          <MatchScore score={suggestion.score} />
        </div>

        <Reasoning text={suggestion.reasoning} />

        <div className="mt-4 flex gap-2">
          <Link to={href} className={buttonClass({ size: 'sm', className: 'flex-1' })} onClick={onView}>
            View profile
          </Link>
          <Button size="sm" variant="outline" onClick={onDismiss} disabled={dismissing}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

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

  const grid = useEntrance<HTMLDivElement>(pending.length)
  const hero = usePointerGlow<HTMLDivElement>()

  // The orb is the state of the work: spinning up while a pass is queued or the
  // list is loading, settled once there is something to read.
  const working = regenerate.isPending || query.isFetching

  return (
    <>
      <PageHeader
        title="AI Suggestions"
        description="Matches generated from your profile, portfolio, and stated preferences."
        actions={
          <Button variant="outline" onClick={() => regenerate.mutate()} disabled={regenerate.isPending}>
            <SparkIcon className="size-4" aria-hidden="true" />
            {regenerate.isPending ? 'Queued…' : 'Regenerate'}
          </Button>
        }
      />

      {/* The one place in the product that gets a hero: the surface where a model,
          not a person, produced what you're reading. The glow follows the pointer
          (anime.js createAnimatable, damped) and the orb is live WebGPU. */}
      <div
        ref={hero}
        className={[
          'relative mb-4 overflow-hidden rounded-2xl border border-line',
          'bg-hero text-hero-ink',
          'shadow-raised',
        ].join(' ')}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-px opacity-70 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(420px circle at var(--glow-x, 50%) var(--glow-y, 0%), color-mix(in oklab, var(--viz-1) 42%, transparent), transparent 70%)',
          }}
        />
        <div className="relative flex flex-col-reverse items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="label-micro text-[color:color-mix(in_oklab,var(--hero-ink)_65%,transparent)]">
              {working ? 'Working' : `${pending.length} open ${pending.length === 1 ? 'match' : 'matches'}`}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.01em]">
              {working ? 'Scoring your network' : 'Matches worth a look'}
            </h2>
            <p className="mt-1 max-w-md text-[13px] leading-relaxed text-[color:color-mix(in_oklab,var(--hero-ink)_72%,transparent)]">
              Every score comes with the reasoning behind it. Dismissing a match teaches the next pass
              what you don't want.
            </p>
          </div>
          <AiOrb state={working ? 'thinking' : 'idle'} size={112} className="sm:mr-2" />
        </div>
      </div>

      {query.isLoading ? (
        <SkeletonRows rows={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : pending.length === 0 ? (
        <EmptyState
          icon={<SparkIcon className="size-6" />}
          title="No suggestions right now"
          description="Suggestions are generated asynchronously. Regenerate to queue a fresh pass."
        />
      ) : (
        <div ref={grid} className="grid gap-3 md:grid-cols-2">
          {pending.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              dismissing={setStatus.isPending}
              onView={() =>
                setStatus.mutate({ id: suggestion.id, status: SuggestionStatus.ACTIONED })
              }
              onDismiss={() =>
                setStatus.mutate({ id: suggestion.id, status: SuggestionStatus.DISMISSED })
              }
            />
          ))}
        </div>
      )}
    </>
  )
}
