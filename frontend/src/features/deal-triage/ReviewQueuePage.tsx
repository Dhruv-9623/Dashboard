import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { opportunityApi, opportunityKeys } from './api'
import { OpportunityStatus } from './types'
import { StatusBadge, ActionBadge } from './StatusBadge'
import { PageHeader } from '@/components/PageHeader'
import { ScoreDial } from '@/components/ScoreDial'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { InboxIcon, PlusIcon } from '@/components/icons'
import { formatMoney, stageLabel } from '@/lib/constants'

type Filter = 'ALL' | OpportunityStatus

export const ReviewQueuePage = () => {
  const [filter, setFilter] = useState<Filter>(OpportunityStatus.PENDING_REVIEW)
  const navigate = useNavigate()

  const query = useQuery({
    queryKey: opportunityKeys.list(),
    queryFn: () => opportunityApi.list(),
    // The scoring agent runs async on intake — poll while anything is mid-score.
    refetchInterval: (q) =>
      q.state.data?.some((deal) => deal.status === OpportunityStatus.SCORING) ? 4000 : false,
  })

  const deals = query.data ?? []
  const countFor = (status: OpportunityStatus) =>
    deals.filter((deal) => deal.status === status).length

  const visible = filter === 'ALL' ? deals : deals.filter((deal) => deal.status === filter)

  return (
    <>
      <PageHeader
        title="Deal Triage"
        description="Every opportunity is scored against your thesis on intake. Approve or reject from the queue."
        actions={
          <Link to="/deal-triage/new">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New opportunity
            </Button>
          </Link>
        }
      />

      <Tabs
        className="mb-5"
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        items={[
          {
            value: OpportunityStatus.PENDING_REVIEW,
            label: 'Pending review',
            count: countFor(OpportunityStatus.PENDING_REVIEW),
          },
          {
            value: OpportunityStatus.SCORING,
            label: 'Scoring',
            count: countFor(OpportunityStatus.SCORING),
          },
          {
            value: OpportunityStatus.APPROVED,
            label: 'Approved',
            count: countFor(OpportunityStatus.APPROVED),
          },
          {
            value: OpportunityStatus.REJECTED,
            label: 'Rejected',
            count: countFor(OpportunityStatus.REJECTED),
          },
          { value: 'ALL', label: 'All', count: deals.length },
        ]}
      />

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<InboxIcon className="h-6 w-6" />}
          title={filter === 'ALL' ? 'No opportunities yet' : 'Nothing in this bucket'}
          description={
            filter === 'ALL'
              ? 'Log your first opportunity and the scoring agent will rank it against your thesis.'
              : 'Try another tab, or log a new opportunity.'
          }
          action={
            <Link to="/deal-triage/new">
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                New opportunity
              </Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHead className="w-20">Score</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Sector / stage</TableHead>
                <TableHead>Ask</TableHead>
                <TableHead>Recommendation</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {visible.map((deal) => (
                <TableRow key={deal.id} onClick={() => navigate(`/deal-triage/${deal.id}`)}>
                  <TableCell>
                    <ScoreDial score={deal.fitScore} size="sm" />
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900">{deal.companyName}</span>
                    {deal.website && (
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {deal.website}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {deal.sector} · {stageLabel(deal.stage)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-gray-600">
                    {formatMoney(deal.askAmount, deal.currency)}
                  </TableCell>
                  <TableCell>
                    {deal.recommendedAction ? (
                      <ActionBadge action={deal.recommendedAction} />
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={deal.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  )
}
