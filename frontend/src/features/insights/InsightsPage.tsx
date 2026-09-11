import { useQuery } from '@tanstack/react-query'
import { insightsApi, insightsKeys } from './api'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { PageHeader } from '@/components/PageHeader'
import { StatTile } from '@/components/StatTile'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Card, CardContent } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChartIcon } from '@/components/icons'
import { formatMoney } from '@/lib/constants'

export const InsightsPage = () => {
  const { user } = useAuth()
  const isStartup = user?.userType === UserType.STARTUP

  const query = useQuery({ queryKey: insightsKeys.all, queryFn: insightsApi.get })

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Insights" description="Engagement and funnel metrics for your profile." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </>
    )
  }

  if (query.isError) {
    return (
      <>
        <PageHeader title="Insights" />
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </>
    )
  }

  const data = query.data
  if (!data) {
    return (
      <>
        <PageHeader title="Insights" />
        <EmptyState
          icon={<ChartIcon className="h-6 w-6" />}
          title="No analytics yet"
          description="Metrics appear once your profile starts getting views and connection requests."
        />
      </>
    )
  }

  const acceptRate = data.connectionRequestsReceived
    ? (data.connectionRequestsAccepted / data.connectionRequestsReceived) * 100
    : 0

  const maxFunnel = Math.max(...data.funnel.map((stage) => stage.count), 1)
  const maxSector = Math.max(...data.sectorBreakdown.map((entry) => entry.count), 1)

  return (
    <>
      <PageHeader
        title="Insights"
        description={
          isStartup
            ? 'How investors are engaging with your profile and round.'
            : 'How founders are engaging with your firm, and where your capital sits.'
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Profile views" value={data.profileViews} />
        <StatTile
          label="Connection requests"
          value={data.connectionRequestsReceived}
          hint={`${Math.round(acceptRate)}% accepted`}
        />
        <StatTile label="Active conversations" value={data.activeConversations} />
        <StatTile label="Wishlisted by" value={data.wishlistedByCount} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatTile
          label={isStartup ? 'Capital raised' : 'Capital deployed'}
          value={formatMoney(data.totalAmount, data.currency)}
        />
        <StatTile
          label={isStartup ? 'Committed investors' : 'Portfolio companies'}
          value={data.entityCount}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {data.funnel.length > 0 && (
          <Card>
            <CardContent className="py-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">Engagement funnel</h2>
              <div className="space-y-4">
                {data.funnel.map((stage) => (
                  <div key={stage.label}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="text-gray-700">{stage.label}</span>
                      <span className="font-semibold tabular-nums text-gray-900">
                        {stage.count}
                      </span>
                    </div>
                    <Progress value={(stage.count / maxFunnel) * 100} tone="blue" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {data.sectorBreakdown.length > 0 && (
          <Card>
            <CardContent className="py-5">
              <h2 className="mb-4 text-sm font-semibold text-gray-900">By sector</h2>
              <div className="space-y-4">
                {data.sectorBreakdown.map((entry) => (
                  <div key={entry.sector}>
                    <div className="mb-1.5 flex items-baseline justify-between text-sm">
                      <span className="text-gray-700">{entry.sector}</span>
                      <span className="tabular-nums text-gray-500">
                        {entry.count} · {formatMoney(entry.amount, data.currency)}
                      </span>
                    </div>
                    <Progress value={(entry.count / maxSector) * 100} tone="green" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
