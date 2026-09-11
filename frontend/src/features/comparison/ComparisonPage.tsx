import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { comparisonApi, comparisonKeys } from './api'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { ScaleIcon } from '@/components/icons'
import { formatMoney, stageLabel } from '@/lib/constants'

const rows = [
  { label: 'Sector', get: (r: ComparisonValue) => r.sector },
  { label: 'Stage', get: (r: ComparisonValue) => r.stage },
  { label: 'Location', get: (r: ComparisonValue) => r.location },
  { label: 'Founded', get: (r: ComparisonValue) => r.founded },
  { label: 'Team size', get: (r: ComparisonValue) => r.teamSize },
  { label: 'Annual revenue', get: (r: ComparisonValue) => r.revenue },
  { label: 'Total raised', get: (r: ComparisonValue) => r.raised },
  { label: 'Open round', get: (r: ComparisonValue) => r.openRound },
  { label: 'Investors', get: (r: ComparisonValue) => r.investors },
]

interface ComparisonValue {
  sector: string
  stage: string
  location: string
  founded: string
  teamSize: string
  revenue: string
  raised: string
  openRound: string
  investors: string
}

export const ComparisonPage = () => {
  const [params] = useSearchParams()
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean)

  const query = useQuery({
    queryKey: comparisonKeys.forIds(ids),
    queryFn: () => comparisonApi.compare(ids),
    enabled: ids.length > 0,
  })

  if (ids.length === 0) {
    return (
      <>
        <PageHeader title="Compare" />
        <EmptyState
          icon={<ScaleIcon className="h-6 w-6" />}
          title="Nothing selected"
          description="Pick two or more startups in Discover, then hit Compare."
          action={
            <Link to="/discover">
              <Button>Go to Discover</Button>
            </Link>
          }
        />
      </>
    )
  }

  if (query.isLoading) return <Skeleton className="h-96 w-full" />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  const results = query.data ?? []

  const valueFor = (row: (typeof results)[number]): ComparisonValue => ({
    sector: row.startup.sector,
    stage: stageLabel(row.startup.stage),
    location: row.startup.location ?? '—',
    founded: row.startup.foundedYear?.toString() ?? '—',
    teamSize: row.startup.teamSize?.toString() ?? '—',
    revenue: formatMoney(row.startup.annualRevenue, row.currency),
    raised: formatMoney(row.totalRaised, row.currency),
    openRound: row.openRound ?? '—',
    investors: row.investorCount.toString(),
  })

  return (
    <>
      <PageHeader
        title="Compare startups"
        description={`Side-by-side view of ${results.length} companies.`}
        actions={
          <Link to="/discover">
            <Button variant="outline">Change selection</Button>
          </Link>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Metric
                </th>
                {results.map((row) => (
                  <th key={row.startup.id} className="min-w-[180px] px-4 py-3 text-left">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={row.startup.name}
                        logoUrl={row.startup.logoUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <Link
                          to={`/startups/${row.startup.id}`}
                          className="block truncate font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                        >
                          {row.startup.name}
                        </Link>
                        {row.startup.isRaising && <Badge variant="success">Raising</Badge>}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-gray-500">{row.label}</td>
                  {results.map((result) => (
                    <td key={result.startup.id} className="px-4 py-3 text-gray-900">
                      {row.get(valueFor(result))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
