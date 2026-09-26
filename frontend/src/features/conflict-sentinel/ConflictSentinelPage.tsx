import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { conflictApi, conflictKeys } from './api'
import { ConflictReportView } from './ConflictReportView'
import { opportunityApi, opportunityKeys } from '@/features/deal-triage/api'
import { investmentApi, investmentKeys } from '@/features/investments/api'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton'
import { ShieldIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { stageLabel } from '@/lib/constants'

export const ConflictSentinelPage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const opportunities = useQuery({
    queryKey: opportunityKeys.list(),
    queryFn: () => opportunityApi.list(),
  })

  // Only the portfolio size matters here, so read the server-side summary rather than a page of rows.
  const portfolio = useQuery({
    queryKey: investmentKeys.summary,
    queryFn: investmentApi.summary,
  })

  const report = useQuery({
    queryKey: conflictKeys.forOpportunity(selectedId ?? ''),
    queryFn: () => conflictApi.getForOpportunity(selectedId as string),
    enabled: Boolean(selectedId),
  })

  const runCheck = useMutation({
    mutationFn: (opportunityId: string) => conflictApi.run(opportunityId),
    onSuccess: (data) =>
      queryClient.setQueryData(conflictKeys.forOpportunity(data.opportunityId), data),
  })

  const deals = (opportunities.data ?? []).filter((deal) =>
    deal.companyName.toLowerCase().includes(search.trim().toLowerCase())
  )

  const portfolioEmpty = (portfolio.data?.totalCount ?? 0) === 0

  return (
    <>
      <PageHeader
        title="Conflict Sentinel"
        description="Check a candidate against your holdings for sector, customer, and competitive-product overlap before you commit."
      />

      {portfolio.isError && (
        <Alert variant="danger" className="mb-5" title="Couldn't load your holdings">
          {errorMessage(portfolio.error)}{' '}
          <button type="button" className="font-medium underline" onClick={() => portfolio.refetch()}>
            Try again
          </button>
        </Alert>
      )}

      {/* Only claim "no investments" after a successful load — an error is not an empty portfolio. */}
      {portfolioEmpty && portfolio.isSuccess && (
        <Alert variant="warning" className="mb-5" title="No investments recorded">
          Conflict checks compare against your holdings, so results will be empty until you{' '}
          <Link to="/investments" className="font-medium underline">
            record your investments
          </Link>
          .
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardContent className="py-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Pick an opportunity</h2>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by company…"
              aria-label="Search opportunities by company"
              className="mb-3"
            />

            {opportunities.isLoading ? (
              <SkeletonRows rows={4} />
            ) : opportunities.isError ? (
              <ErrorState
                title="Couldn't load opportunities"
                error={opportunities.error}
                onRetry={() => opportunities.refetch()}
              />
            ) : deals.length === 0 ? (
              <p className="py-4 text-sm text-ink-muted">
                {search ? 'No matches.' : 'No opportunities logged yet.'}
              </p>
            ) : (
              <ul className="max-h-[26rem] space-y-1 overflow-y-auto">
                {deals.map((deal) => (
                  <li key={deal.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(deal.id)}
                      className={cn(
                        'w-full rounded px-3 py-2 text-left transition-colors',
                        selectedId === deal.id
                          ? 'bg-brand-subtle text-brand-ink'
                          : 'hover:bg-surface-sunken text-ink-secondary'
                      )}
                    >
                      <span className="block truncate text-sm font-medium">{deal.companyName}</span>
                      <span className="block text-xs text-ink-secondary">
                        {deal.sector} · {stageLabel(deal.stage)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div>
          {!selectedId ? (
            <EmptyState
              icon={<ShieldIcon className="h-6 w-6" />}
              title="Select an opportunity"
              description="Pick a deal on the left to run an overlap analysis against your portfolio."
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  to={`/deal-triage/${selectedId}`}
                  className="text-sm text-brand-ink hover:underline"
                >
                  Open this deal in Triage
                </Link>
                <Button
                  onClick={() => runCheck.mutate(selectedId)}
                  disabled={runCheck.isPending}
                >
                  <ShieldIcon className="mr-2 h-4 w-4" />
                  {runCheck.isPending
                    ? 'Analysing…'
                    : report.data
                      ? 'Re-run check'
                      : 'Run conflict check'}
                </Button>
              </div>

              {runCheck.isError && <Alert variant="danger">{errorMessage(runCheck.error)}</Alert>}

              {report.isLoading || runCheck.isPending ? (
                <Skeleton className="h-72 w-full" />
              ) : report.isError ? (
                <ErrorState error={report.error} onRetry={() => report.refetch()} />
              ) : report.data ? (
                <ConflictReportView report={report.data} />
              ) : (
                <EmptyState
                  icon={<ShieldIcon className="h-6 w-6" />}
                  title="No report yet"
                  description="Run a conflict check to compare this candidate against every portfolio company."
                />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
