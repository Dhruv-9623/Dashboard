import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { digestApi, portfolioKeys } from './api'
import { AlertSeverity, severityLabels } from './types'
import type { DigestAlertDTO } from './types'
import { PageHeader } from '@/components/PageHeader'
import { Markdown } from '@/components/Markdown'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
import { Skeleton, SkeletonRows } from '@/components/ui/Skeleton'
import { PulseIcon, SparkIcon, WarningIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/constants'

const severityVariants: Record<AlertSeverity, 'secondary' | 'warning' | 'danger'> = {
  [AlertSeverity.INFO]: 'secondary',
  [AlertSeverity.WARNING]: 'warning',
  [AlertSeverity.CRITICAL]: 'danger',
}

const AlertRow = ({ alert }: { alert: DigestAlertDTO }) => (
  <li className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
    <WarningIcon
      className={cn(
        'mt-0.5 h-4 w-4 shrink-0',
        alert.severity === AlertSeverity.CRITICAL
          ? 'text-red-500'
          : alert.severity === AlertSeverity.WARNING
            ? 'text-amber-500'
            : 'text-gray-400'
      )}
    />
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {alert.startupName && (
          <span className="text-sm font-medium text-gray-900">{alert.startupName}</span>
        )}
        <Badge variant={severityVariants[alert.severity]}>{severityLabels[alert.severity]}</Badge>
      </div>
      <p className="mt-1 text-sm text-gray-700">{alert.message}</p>
    </div>
  </li>
)

export const PulsePage = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const digests = useQuery({
    queryKey: portfolioKeys.digests,
    queryFn: digestApi.list,
  })

  const generate = useMutation({
    mutationFn: digestApi.generate,
    onSuccess: (digest) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.digests })
      setSelectedId(digest.id)
    },
  })

  const list = digests.data ?? []
  const selected = list.find((digest) => digest.id === selectedId) ?? list[0] ?? null

  return (
    <>
      <PageHeader
        title="Portfolio Pulse"
        description="A plain-English digest of portfolio status with alerts on what moved. Runs weekly, or on demand."
        actions={
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            <SparkIcon className="mr-2 h-4 w-4" />
            {generate.isPending ? 'Composing…' : 'Generate now'}
          </Button>
        }
      />

      {generate.isError && (
        <Alert variant="danger" className="mb-5">
          {errorMessage(generate.error)}
        </Alert>
      )}

      {digests.isLoading ? (
        <SkeletonRows rows={3} />
      ) : digests.isError ? (
        <ErrorState error={digests.error} onRetry={() => digests.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<PulseIcon className="h-6 w-6" />}
          title="No digests yet"
          description="The weekly job has not produced a digest. Generate one now to see the current state of the portfolio."
          action={
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <SparkIcon className="mr-2 h-4 w-4" />
              {generate.isPending ? 'Composing…' : 'Generate now'}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardContent className="py-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Digests</h2>
              <ul className="space-y-1">
                {list.map((digest) => (
                  <li key={digest.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(digest.id)}
                      className={cn(
                        'w-full rounded px-3 py-2 text-left transition-colors',
                        selected?.id === digest.id
                          ? 'bg-blue-50 text-blue-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <span className="block text-sm font-medium">
                        {formatDate(digest.periodEnd)}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {digest.companyCount} companies · {digest.alerts.length} alerts
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {generate.isPending ? (
            <Skeleton className="h-96 w-full" />
          ) : selected ? (
            <div className="space-y-5">
              <Card>
                <CardContent className="py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-4">
                    <h2 className="text-base font-semibold text-gray-900">
                      {formatDate(selected.periodStart)} – {formatDate(selected.periodEnd)}
                    </h2>
                    <span className="text-xs text-gray-500">
                      {selected.sentAt
                        ? `Emailed ${formatDateTime(selected.sentAt)}`
                        : 'Not emailed'}
                    </span>
                  </div>
                  <Markdown content={selected.summaryMarkdown} />
                </CardContent>
              </Card>

              {selected.alerts.length > 0 && (
                <Card>
                  <CardContent className="py-5">
                    <h2 className="mb-3 text-sm font-semibold text-gray-900">
                      Alerts ({selected.alerts.length})
                    </h2>
                    <ul className="space-y-2">
                      {selected.alerts.map((alert, index) => (
                        <AlertRow key={index} alert={alert} />
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}
