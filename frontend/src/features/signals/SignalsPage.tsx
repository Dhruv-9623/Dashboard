import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { signalApi, signalKeys } from './api'
import { SignalType, sentimentLabels, sentimentVariants, signalTypeLabels } from './types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { NewsIcon, SparkIcon } from '@/components/icons'
import { formatDate } from '@/lib/constants'

type Filter = 'ALL' | SignalType

export const SignalsPage = () => {
  const [filter, setFilter] = useState<Filter>('ALL')

  const query = useQuery({
    queryKey: signalKeys.all(filter === 'ALL' ? undefined : filter),
    queryFn: () => signalApi.list(filter === 'ALL' ? undefined : filter),
  })

  const signals = query.data ?? []

  return (
    <>
      <PageHeader
        title="Signals"
        description="Curated news about the companies and firms you track."
      />

      <Tabs
        className="mb-5"
        value={filter}
        onChange={(value) => setFilter(value as Filter)}
        items={[
          { value: 'ALL', label: 'All' },
          ...Object.values(SignalType).map((type) => ({
            value: type,
            label: signalTypeLabels[type],
          })),
        ]}
      />

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : signals.length === 0 ? (
        <EmptyState
          icon={<NewsIcon className="h-6 w-6" />}
          title="No signals yet"
          description="Signals are aggregated in the background. Check back once your portfolio and pool have companies in them."
        />
      ) : (
        <div className="space-y-3">
          {signals.map((signal) => {
            const subjectHref = signal.relatedStartupId
              ? `/startups/${signal.relatedStartupId}`
              : signal.relatedVCFirmId
                ? `/firms/${signal.relatedVCFirmId}`
                : null
            const subjectName = signal.relatedStartupName ?? signal.relatedVCFirmName

            return (
              <Card key={signal.id}>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{signalTypeLabels[signal.signalType]}</Badge>
                    <Badge variant={sentimentVariants[signal.sentiment]}>
                      {sentimentLabels[signal.sentiment]}
                    </Badge>
                    {signal.aiGenerated && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <SparkIcon className="h-3.5 w-3.5" />
                        AI summary
                      </span>
                    )}
                    <span className="ml-auto text-xs text-gray-500">
                      {formatDate(signal.publishedAt)}
                    </span>
                  </div>

                  <h2 className="mt-2 text-base font-semibold text-gray-900">
                    {signal.sourceUrl ? (
                      <a
                        href={signal.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:text-blue-700 hover:underline"
                      >
                        {signal.headline}
                      </a>
                    ) : (
                      signal.headline
                    )}
                  </h2>

                  {signal.summary && (
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{signal.summary}</p>
                  )}

                  {subjectHref && subjectName && (
                    <Link
                      to={subjectHref}
                      className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                    >
                      {subjectName}
                    </Link>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
