import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { vcFirmApi } from './api'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { ConnectButton } from '@/features/messaging/ConnectButton'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { StatTile } from '@/components/StatTile'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatMoney } from '@/lib/constants'

export const VCFirmDetailPage = () => {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isStartup = user?.userType === UserType.STARTUP

  const query = useQuery({
    queryKey: ['vc-firms', 'detail', id],
    queryFn: () => vcFirmApi.getFirm(id),
    enabled: Boolean(id),
  })

  if (query.isLoading) return <Skeleton className="h-96 w-full" />
  if (query.isError || !query.data) {
    return <ErrorState error={query.error ?? new Error('Firm not found')} />
  }

  const firm = query.data

  return (
    <>
      <PageHeader
        title={firm.name}
        description={firm.location ?? undefined}
        actions={
          isStartup ? (
            <ConnectButton targetType="VC_FIRM" targetId={firm.id} targetName={firm.name} />
          ) : undefined
        }
      />

      <div className="space-y-5">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-start gap-4">
              <Avatar name={firm.name} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  {firm.sectors?.map((sector) => (
                    <Badge key={sector} variant="secondary">
                      {sector}
                    </Badge>
                  ))}
                  {firm.investmentStage && <Badge>{firm.investmentStage}</Badge>}
                </div>
                {firm.website && (
                  <a
                    href={firm.website}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    {firm.website}
                  </a>
                )}
              </div>
            </div>

            {firm.description && (
              <p className="mt-5 text-sm leading-relaxed text-gray-700">{firm.description}</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Assets under management"
            value={firm.aum ? formatMoney(firm.aum * 1_000_000, 'INR') : '—'}
          />
          <StatTile label="Investment stage" value={firm.investmentStage ?? '—'} />
          <StatTile label="Founded" value={firm.foundedYear ?? '—'} />
        </div>
      </div>
    </>
  )
}
