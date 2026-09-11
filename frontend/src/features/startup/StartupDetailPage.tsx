import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { startupApi, startupKeys } from './api'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { ConnectButton } from '@/features/messaging/ConnectButton'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { StatTile } from '@/components/StatTile'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { FileIcon, MailIcon } from '@/components/icons'
import { formatMoney, stageLabel } from '@/lib/constants'

export const StartupDetailPage = () => {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const isVC = user?.userType === UserType.VC

  const query = useQuery({
    queryKey: startupKeys.detail(id),
    queryFn: () => startupApi.get(id),
    enabled: Boolean(id),
  })

  if (query.isLoading) return <Skeleton className="h-96 w-full" />
  if (query.isError || !query.data) {
    return <ErrorState error={query.error ?? new Error('Startup not found')} />
  }

  const startup = query.data

  return (
    <>
      <PageHeader
        title={startup.name}
        description={`${startup.sector} · ${stageLabel(startup.stage)}${startup.location ? ` · ${startup.location}` : ''}`}
        actions={
          isVC ? (
            <>
              <Link to={`/outreach?startupId=${startup.id}`}>
                <Button variant="outline">
                  <MailIcon className="mr-2 h-4 w-4" />
                  Outreach
                </Button>
              </Link>
              <ConnectButton targetType="STARTUP" targetId={startup.id} targetName={startup.name} />
            </>
          ) : undefined
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="space-y-5">
          <Card>
            <CardContent className="py-5">
              <div className="flex items-start gap-4">
                <Avatar name={startup.name} logoUrl={startup.logoUrl} size="lg" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {startup.isRaising && <Badge variant="success">Actively raising</Badge>}
                    <Badge variant="secondary">{stageLabel(startup.stage)}</Badge>
                    <Badge variant="secondary">{startup.sector}</Badge>
                  </div>
                  {startup.website && (
                    <a
                      href={startup.website}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                    >
                      {startup.website}
                    </a>
                  )}
                </div>
              </div>

              {startup.description && (
                <p className="mt-5 text-sm leading-relaxed text-gray-700">{startup.description}</p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Annual revenue"
              value={formatMoney(startup.annualRevenue, 'INR')}
            />
            <StatTile label="Team size" value={startup.teamSize ?? '—'} />
            <StatTile label="Founded" value={startup.foundedYear ?? '—'} />
          </div>
        </div>

        <div className="space-y-5">
          {startup.pitchDeckUrl && (
            <Card>
              <CardContent className="py-5">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">Materials</h2>
                <a href={startup.pitchDeckUrl} target="_blank" rel="noreferrer noopener">
                  <Button variant="outline" className="w-full">
                    <FileIcon className="mr-2 h-4 w-4" />
                    Pitch deck
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="py-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">At a glance</h2>
              <dl className="divide-y divide-gray-100 text-sm">
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Sector</dt>
                  <dd className="font-medium text-gray-900">{startup.sector}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Stage</dt>
                  <dd className="font-medium text-gray-900">{stageLabel(startup.stage)}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500">Location</dt>
                  <dd className="font-medium text-gray-900">{startup.location ?? '—'}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
