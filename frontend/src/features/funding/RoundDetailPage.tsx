import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fundingApi, fundingKeys } from './api'
import {
  CommitmentStatus,
  commitmentStatusLabels,
  commitmentStatusVariants,
  cycleStatusLabels,
  cycleStatusVariants,
  likelyAmount,
  pledgedAmount,
} from './types'
import type { CommitmentEventDTO, FundingCycleDTO } from './types'
import { RoundProgress } from './RoundProgress'
import { RoundMomentum, roundFillTable } from './RoundMomentum'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { roundLabel } from '@/features/investments/types'
import { PageHeader } from '@/components/PageHeader'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { StatTile } from '@/components/StatTile'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton'
import { ChartFrame } from '@/components/charts/ChartFrame'
import { CoinsIcon, FileIcon } from '@/components/icons'
import { safeUrl } from '@/lib/utils'
import { formatDate, formatDateTime, formatMoney, stageLabel } from '@/lib/constants'
import { useDocumentTitle } from '@/lib/useDocumentTitle'

/**
 * One line of the round's history, in words.
 *
 * The event carries both sides of the change rather than a label, so the sentence is derived here
 * — which keeps the server from having to guess what phrasing each client wants.
 */
const describe = (event: CommitmentEventDTO) => {
  const amount = formatMoney(event.toAmount, event.currency)
  const band = commitmentStatusLabels[event.toStatus].toLowerCase()

  if (event.fromStatus === null) return `pledged ${amount} — ${band}`
  if (event.toStatus === CommitmentStatus.WITHDRAWN) return `withdrew ${amount}`
  if (event.fromStatus === event.toStatus) {
    const was = formatMoney(event.fromAmount ?? 0, event.currency)
    const direction = event.toAmount > (event.fromAmount ?? 0) ? 'raised' : 'reduced'
    return `${direction} ${was} to ${amount}`
  }
  return `moved ${amount} to ${band}`
}

const History = ({ cycle, events }: { cycle: FundingCycleDTO; events: CommitmentEventDTO[] }) => {
  if (events.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Nothing has moved on this round yet. Every pledge, change and withdrawal is recorded here
        as it happens.
      </p>
    )
  }

  return (
    <>
      <ChartFrame
        title="How the round filled"
        description="Signed money at the bottom, conversations stacked on top — the shape says how solid the total is."
        table={{ columns: ['Date', 'Standing'], rows: roundFillTable(events, cycle) }}
      >
        <RoundMomentum cycle={cycle} events={events} />
      </ChartFrame>

      {/* Newest first here, the opposite of the chart: a list is read from the top. */}
      <ol className="mt-5 space-y-3">
        {[...events].reverse().map((event) => (
          <li key={event.id} className="flex gap-3 text-sm">
            <span
              aria-hidden="true"
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line-strong"
            />
            <div className="min-w-0">
              <p className="text-ink">
                <span className="font-medium">{event.vcFirmName ?? 'An investor'}</span>{' '}
                {describe(event)}
              </p>
              <p className="text-xs text-ink-muted">{formatDateTime(event.occurredAt)}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}

/**
 * One funding round, in full.
 *
 * Reachable from both sides and deliberately the same page for each, because the round is the same
 * object: what differs is how much of it the server will hand over. A founder gets every
 * investor's pledges and the whole history; an investor gets the round and its own firm's moves,
 * because the timing of a rival's decisions shows its process, not just its position.
 */
export const RoundDetailPage = () => {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isFounder = user?.userType === UserType.STARTUP

  const cycleQuery = useQuery({
    queryKey: fundingKeys.detail(id),
    queryFn: () => fundingApi.get(id),
    enabled: Boolean(id),
  })

  const commitmentsQuery = useQuery({
    queryKey: fundingKeys.commitments(id),
    queryFn: () => fundingApi.listCommitments(id),
    enabled: Boolean(id),
  })

  const historyQuery = useQuery({
    queryKey: fundingKeys.history(id),
    queryFn: () => fundingApi.listHistory(id),
    enabled: Boolean(id),
  })

  const cycle = cycleQuery.data
  useDocumentTitle(cycle ? `${cycle.startupName} · ${roundLabel(cycle.roundType)}` : 'Round')

  if (cycleQuery.isLoading) return <Skeleton className="h-96 w-full" />
  if (cycleQuery.isError || !cycle) {
    return (
      <ErrorState
        error={cycleQuery.error ?? new Error('Round not found')}
        onRetry={cycleQuery.isError ? () => cycleQuery.refetch() : undefined}
      />
    )
  }

  const commitments = commitmentsQuery.data ?? []
  const pledged = pledgedAmount(cycle)
  const percent = cycle.targetAmount > 0 ? Math.round((pledged / cycle.targetAmount) * 100) : 0

  return (
    <>
      <PageHeader
        title={`${roundLabel(cycle.roundType)} · ${cycle.startupName}`}
        description={`${cycle.startupSector} · ${stageLabel(cycle.startupStage)} · opened ${formatDate(cycle.openedAt)}${
          cycle.closedAt ? ` · closed ${formatDate(cycle.closedAt)}` : ''
        }`}
        actions={
          <Link
            to={isFounder ? '/funding' : '/deal-flow'}
            className={buttonClass({ variant: 'secondary' })}
          >
            {isFounder ? 'All rounds' : 'Deal flow'}
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="space-y-5">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-start gap-3">
                <EntityAvatar name={cycle.startupName} />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/startups/${cycle.startupId}`}
                    className="link-target inline-block font-medium text-ink hover:text-brand-ink hover:underline"
                  >
                    {cycle.startupName}
                  </Link>
                  <p className="text-xs text-ink-muted">{cycle.startupSector}</p>
                </div>
                <Badge variant={cycleStatusVariants[cycle.status]}>
                  {cycleStatusLabels[cycle.status]}
                </Badge>
              </div>

              <RoundProgress cycle={cycle} className="mt-5" percent />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <h2 className="text-sm font-semibold text-ink">
                {isFounder ? 'Investors' : 'Your pledge'}
              </h2>
              {commitmentsQuery.isLoading ? (
                <SkeletonRows rows={2} />
              ) : commitments.length === 0 ? (
                <p className="mt-3 text-sm text-ink-muted">
                  {isFounder
                    ? 'No commitments on this round yet.'
                    : "Your firm hasn't pledged into this round."}
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {commitments.map((commitment) => (
                    <li key={commitment.id} className="flex items-center gap-3 py-2.5">
                      <EntityAvatar name={commitment.vcFirmName ?? 'Investor'} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {commitment.vcFirmName ?? 'Your firm'}
                      </span>
                      <span className="tabular text-sm text-ink">
                        {formatMoney(commitment.amount, commitment.currency)}
                      </span>
                      <Badge variant={commitmentStatusVariants[commitment.status]}>
                        {commitmentStatusLabels[commitment.status]}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-5">
              <h2 className="mb-4 text-sm font-semibold text-ink">History</h2>
              {historyQuery.isLoading ? (
                <SkeletonRows rows={3} />
              ) : historyQuery.isError ? (
                <ErrorState error={historyQuery.error} onRetry={() => historyQuery.refetch()} />
              ) : (
                <History cycle={cycle} events={historyQuery.data ?? []} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-1">
              <StatTile label="Target" value={formatMoney(cycle.targetAmount, cycle.currency)} />
              <StatTile
                label="Committed"
                value={formatMoney(cycle.committedAmount, cycle.currency)}
                hint="Signed — the number to plan against"
              />
              <StatTile
                label="Likely to land"
                value={formatMoney(likelyAmount(cycle), cycle.currency)}
                hint="Committed plus soft, indications excluded"
              />
              <StatTile label="Pledged of target" value={`${percent}%`} />
              <StatTile label="Investors" value={String(cycle.commitmentCount)} />
              <StatTile
                label="Ticket band"
                value={
                  cycle.minTicketSize || cycle.maxTicketSize
                    ? `${cycle.minTicketSize ? formatMoney(cycle.minTicketSize, cycle.currency) : 'any'} – ${
                        cycle.maxTicketSize ? formatMoney(cycle.maxTicketSize, cycle.currency) : 'any'
                      }`
                    : 'No limits'
                }
              />
            </CardContent>
          </Card>

          {(safeUrl(cycle.pitchDeckUrl) || safeUrl(cycle.dataRoomUrl)) && (
            <Card>
              <CardContent className="space-y-2 py-5">
                <h2 className="text-sm font-semibold text-ink">Documents</h2>
                {safeUrl(cycle.pitchDeckUrl) && (
                  <a
                    href={safeUrl(cycle.pitchDeckUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-target inline-flex items-center gap-2 text-sm text-brand-ink hover:underline"
                  >
                    <FileIcon className="size-4" aria-hidden="true" />
                    Pitch deck
                  </a>
                )}
                {safeUrl(cycle.dataRoomUrl) && (
                  <a
                    href={safeUrl(cycle.dataRoomUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-target inline-flex items-center gap-2 text-sm text-brand-ink hover:underline"
                  >
                    <FileIcon className="size-4" aria-hidden="true" />
                    Data room
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {!isFounder && cycle.status === 'OPEN' && commitments.length === 0 && (
            <EmptyState
              icon={<CoinsIcon className="size-6" />}
              title="Not pledged yet"
              description="Pledge from Deal Flow to put your firm on this round."
              action={
                <Link to="/deal-flow" className={buttonClass()}>
                  Go to deal flow
                </Link>
              }
            />
          )}
        </div>
      </div>
    </>
  )
}
