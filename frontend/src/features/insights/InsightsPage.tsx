import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { insightsApi, insightsKeys } from './api'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { investmentApi, investmentKeys } from '@/features/investments/api'
import {
  concentration,
  cumulativeDeployed,
  dealsPerQuarter,
  dominantCurrency,
  monthsSinceLastDeal,
  roundExposure,
  sectorExposure,
  sparkValues,
} from '@/features/investments/portfolioSeries'
import { InvestmentRound } from '@/features/investments/types'
import { poolApi, poolKeys } from '@/features/pool/api'
import { InterestLevel, interestLevelLabels } from '@/features/pool/types'
import { InsightsFilterBar } from './InsightsFilterBar'
import { applyFilters, useInsightsFilters } from './useInsightsFilters'
import { PageHeader } from '@/components/PageHeader'
import { MetricCard } from '@/components/MetricCard'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ChartEmpty, ChartFrame } from '@/components/charts/ChartFrame'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { BarSeries } from '@/components/charts/BarSeries'
import { FunnelChart } from '@/components/charts/FunnelChart'
import { HeatGrid } from '@/components/charts/HeatGrid'
import { ScatterPlot } from '@/components/charts/ScatterPlot'
import { RankedBars } from '@/components/charts/RankedBars'
import { CompanyBreakdown } from '@/components/charts/CompanyBreakdown'
import { withinRange } from '@/components/charts/RangeFilter'
import { ChartIcon } from '@/components/icons'
import { formatMoney, formatMoneyShort, pluralize } from '@/lib/constants'
import { roundLabels } from '@/features/investments/types'
import { useEntrance } from '@/lib/useMotion'

export const InsightsPage = () => {
  const { user } = useAuth()
  const isStartup = user?.userType === UserType.STARTUP
  const { filters, setFilter, clear, activeCount } = useInsightsFilters()

  const query = useQuery({ queryKey: insightsKeys.all, queryFn: insightsApi.get })

  // VC only: the records behind the derived charts. Founders don't have a
  // portfolio, so the page falls back to the server's own analytics for them.
  const ledgerParams = { size: 100 }
  const ledger = useQuery({
    queryKey: investmentKeys.list(ledgerParams),
    queryFn: () => investmentApi.list(ledgerParams),
    enabled: !isStartup,
  })

  // The pool is the other half of a firm's activity, and Insights never showed it.
  const poolParams = { size: 100 }
  const pool = useQuery({
    queryKey: poolKeys.list(poolParams),
    queryFn: () => poolApi.list(poolParams),
    enabled: !isStartup,
  })

  const metrics = useEntrance<HTMLDivElement>(query.data ? 'loaded' : 'loading')

  /** Everything in the window, before the dimension filters — the filter bar's own options come from this. */
  const inRange = useMemo(
    () => withinRange(ledger.data?.items ?? [], filters.range, (item) => item.investmentDate),
    [ledger.data, filters.range]
  )
  const records = useMemo(() => applyFilters(inRange, filters), [inRange, filters])

  const sectorOptionsInData = useMemo(
    () => [...new Set(inRange.map((item) => item.startupSector?.trim() || 'Unspecified'))].sort(),
    [inRange]
  )
  const roundOptionsInData = useMemo(
    () =>
      Object.values(InvestmentRound).filter((round) =>
        inRange.some((item) => item.round === round)
      ),
    [inRange]
  )

  const currency = dominantCurrency(records) ?? query.data?.currency ?? 'INR'
  const money = (value: number) => formatMoney(value, currency)
  const moneyTick = (value: number) => formatMoneyShort(value, currency)

  const deployment = useMemo(() => cumulativeDeployed(records, currency), [records, currency])
  const pace = useMemo(() => dealsPerQuarter(records), [records])
  const sectors = useMemo(() => sectorExposure(records, currency), [records, currency])
  const rounds = useMemo(
    () => roundExposure(records, currency, Object.values(InvestmentRound)),
    [records, currency]
  )
  const shape = useMemo(() => concentration(records, currency), [records, currency])
  const staleness = useMemo(() => monthsSinceLastDeal(records), [records])

  /** The pipeline behind the portfolio, by how warm each name is. */
  const pipeline = useMemo(() => {
    const entries = pool.data?.items ?? []
    const counts = new Map<InterestLevel, number>()
    for (const entry of entries) {
      counts.set(entry.interestLevel, (counts.get(entry.interestLevel) ?? 0) + 1)
    }
    const total = entries.length
    // Warmest first: the order is the scale, not the size.
    return [InterestLevel.HIGH_PRIORITY, InterestLevel.INTERESTED, InterestLevel.WATCHING]
      .filter((level) => counts.has(level))
      .map((level) => ({
        label: interestLevelLabels[level],
        value: counts.get(level) ?? 0,
        share: total > 0 ? (counts.get(level) ?? 0) / total : 0,
      }))
  }, [pool.data])

  /** One cell per month: how many cheques were written in it. */
  const activity = useMemo(() => {
    const counts = new Map<string, number>()
    for (const record of records) {
      const period = record.investmentDate.slice(0, 7)
      counts.set(period, (counts.get(period) ?? 0) + 1)
    }
    return [...counts.entries()].map(([period, value]) => ({ period, value }))
  }, [records])

  /** Deals against capital, one point per sector — many small cheques, or few large. */
  const sectorShape = useMemo(() => {
    const totals = new Map<string, { count: number; amount: number }>()
    for (const record of records) {
      if (record.currency !== currency) continue
      const sector = record.startupSector?.trim() || 'Unspecified'
      const entry = totals.get(sector) ?? { count: 0, amount: 0 }
      entry.count += 1
      entry.amount += record.amount
      totals.set(sector, entry)
    }
    return [...totals.entries()].map(([label, entry]) => ({
      label,
      x: entry.count,
      y: entry.amount,
    }))
  }, [records, currency])

  if (query.isLoading) {
    return (
      <>
        <PageHeader title="Insights" description="Engagement and funnel metrics for your profile." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[104px]" />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
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
          icon={<ChartIcon className="size-6" />}
          title="No analytics yet"
          description="Metrics appear once your profile starts getting views and connection requests."
        />
      </>
    )
  }

  const acceptRate = data.connectionRequestsReceived
    ? (data.connectionRequestsAccepted / data.connectionRequestsReceived) * 100
    : 0

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

      {!isStartup && (
        <InsightsFilterBar
          filters={filters}
          setFilter={setFilter}
          clear={clear}
          activeCount={activeCount}
          sectors={sectorOptionsInData}
          rounds={roundOptionsInData}
        />
      )}

      <div ref={metrics} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Profile views"
          count={{ to: data.profileViews, format: (value) => String(Math.round(value)) }}
          hint="All time"
          accent="var(--viz-1)"
        />
        <MetricCard
          label="Connection requests"
          count={{
            to: data.connectionRequestsReceived,
            format: (value) => String(Math.round(value)),
          }}
          hint={`${Math.round(acceptRate)}% accepted`}
          accent="var(--viz-2)"
        />
        <MetricCard
          label="Active conversations"
          count={{ to: data.activeConversations, format: (value) => String(Math.round(value)) }}
          hint="Open threads"
          accent="var(--viz-3)"
        />
        <MetricCard
          label="Wishlisted by"
          count={{ to: data.wishlistedByCount, format: (value) => String(Math.round(value)) }}
          hint={isStartup ? 'Investors watching you' : 'Founders watching you'}
          accent="var(--viz-5)"
        />
      </div>

      {!isStartup && records.length > 0 && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Average cheque"
            value={money(shape.average)}
            hint={`Median ${money(shape.median)}`}
          />
          <MetricCard
            label="Largest position"
            value={`${Math.round(shape.largestShare * 100)}%`}
            hint={shape.topName ? `${shape.topName}, the largest holding` : undefined}
            tone={shape.largestShare > 0.4 ? 'notice' : 'default'}
          />
          <MetricCard
            label="Since last cheque"
            value={staleness === null ? '—' : staleness === 0 ? 'This month' : `${staleness} mo`}
            hint="Within the selected range"
            tone={staleness !== null && staleness >= 6 ? 'notice' : 'default'}
          />
          <MetricCard
            label="Companies"
            count={{
              to: new Set(records.map((record) => record.startupId)).size,
              format: (value) => String(Math.round(value)),
            }}
            hint={pluralize(records.length, 'cheque')}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ChartFrame
          title="Engagement funnel"
          description="Where people drop out between one step and the next."
          table={{
            columns: ['Stage', 'Count'],
            rows: data.funnel.map((stage) => [stage.label, String(stage.count)]),
          }}
        >
          {data.funnel.length > 1 ? (
            <FunnelChart stages={data.funnel} />
          ) : (
            <ChartEmpty message="The funnel fills in as people view your profile and reach out." />
          )}
        </ChartFrame>

        <ChartFrame
          title={isStartup ? 'Commitments by sector' : 'Portfolio by sector'}
          description={
            isStartup
              ? `Capital by sector in ${data.currency}, across everything on record.`
              : `Capital by sector in ${currency}, for the slice selected above.`
          }
          stale={!isStartup && ledger.isFetching && !ledger.isLoading}
          table={{
            columns: ['Sector', `Capital (${isStartup ? data.currency : currency})`],
            rows: (isStartup
              ? data.sectorBreakdown.map((entry) => ({
                  label: entry.sector,
                  value: entry.amount,
                }))
              : sectors
            ).map((entry) => [entry.label, formatMoney(entry.value, isStartup ? data.currency : currency)]),
          }}
        >
          {isStartup ? (
            data.sectorBreakdown.length > 0 ? (
              <RankedBars
                // Sorted here: the server returns its own order, and a "ranked"
                // list that isn't ranked is worse than an unsorted one.
                items={[...data.sectorBreakdown]
                  .sort((a, b) => b.amount - a.amount)
                  .map((entry) => ({
                    label: `${entry.sector} · ${pluralize(entry.count, 'deal')}`,
                    value: entry.amount,
                    share:
                      entry.amount /
                      data.sectorBreakdown.reduce((sum, item) => sum + item.amount, 0),
                  }))}
                format={(value) => formatMoney(value, data.currency)}
              />
            ) : (
              <ChartEmpty message="Sector mix appears once there are commitments to compare." />
            )
          ) : sectors.length > 0 ? (
            <RankedBars items={sectors} format={money} />
          ) : (
            <ChartEmpty message="No positions in this slice. Clear a filter, or widen the range." />
          )}
        </ChartFrame>
      </div>

      {!isStartup && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <ChartFrame
              title="Capital deployed over time"
              description={`Running total in ${currency} over the selected range.`}
              stale={ledger.isFetching && !ledger.isLoading}
              aside={
                deployment.length > 0 ? (
                  <span className="text-[13px] font-semibold tabular text-ink">
                    {money(deployment[deployment.length - 1].value)}
                  </span>
                ) : undefined
              }
              table={{
                columns: ['Month', `Cumulative (${currency})`],
                rows: deployment.map((point) => [point.label, money(point.value)]),
              }}
            >
              {deployment.length > 1 ? (
                <AreaTrend
                  data={deployment}
                  format={money}
                  tickFormat={moneyTick}
                  seriesName="Deployed"
                  height={240}
                />
              ) : (
                <ChartEmpty message="Widen the range, or record another position, to draw this curve." />
              )}
            </ChartFrame>

            <ChartFrame
              title="Investment activity"
              description="Cheques written, month by month."
              stale={ledger.isFetching && !ledger.isLoading}
              table={{
                columns: ['Month', 'Deals'],
                rows: activity.map((cell) => [cell.period, String(cell.value)]),
              }}
            >
              {activity.length > 0 ? (
                <HeatGrid
                  cells={activity}
                  describe={(value) => (value === 0 ? 'no deals' : pluralize(value, 'deal'))}
                />
              ) : (
                <ChartEmpty message="No investments in this range." />
              )}
            </ChartFrame>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
            <ChartFrame
              title="Pace"
              description="Cheques written per quarter."
              stale={ledger.isFetching && !ledger.isLoading}
              table={{
                columns: ['Quarter', 'Deals'],
                rows: pace.map((point) => [point.label, String(point.value)]),
              }}
            >
              {pace.length > 1 ? (
                <BarSeries
                  data={pace}
                  format={(value) => String(value)}
                  seriesName="Deals"
                  color="var(--viz-2)"
                />
              ) : (
                <ChartEmpty message="Pace needs deals across more than one quarter." />
              )}
            </ChartFrame>

            <ChartFrame
              title="Cheque size against frequency"
              description={`Each sector as one point: how many deals, and how much capital in ${currency}.`}
              stale={ledger.isFetching && !ledger.isLoading}
              table={{
                columns: ['Sector', `Deals · capital (${currency})`],
                rows: sectorShape.map((point) => [
                  point.label,
                  `${point.x} · ${money(point.y)}`,
                ]),
              }}
            >
              {sectorShape.length > 0 ? (
                <ScatterPlot
                  points={sectorShape}
                  xLabel="Deals"
                  yLabel="Capital"
                  formatX={(value) => String(value)}
                  formatY={moneyTick}
                  height={240}
                />
              ) : (
                <ChartEmpty message="No positions in this range." />
              )}
            </ChartFrame>
          </div>
        </>
      )}

      {!isStartup && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartFrame
            title="By round"
            description="Capital by round, in sequence rather than by size."
            stale={ledger.isFetching && !ledger.isLoading}
            table={{
              columns: ['Round', `Capital (${currency})`],
              rows: rounds.map((round) => [
                roundLabels[round.label as keyof typeof roundLabels] ?? round.label,
                money(round.value),
              ]),
            }}
          >
            {rounds.length > 0 ? (
              <RankedBars
                items={rounds.map((round) => ({
                  ...round,
                  label: roundLabels[round.label as keyof typeof roundLabels] ?? round.label,
                }))}
                format={money}
                limit={8}
              />
            ) : (
              <ChartEmpty message="No positions in this slice." />
            )}
          </ChartFrame>

          <ChartFrame
            title="Pipeline behind the book"
            description="Companies in your pool, by how warm each one is. Not affected by the filters above."
            stale={pool.isFetching && !pool.isLoading}
            aside={
              pool.data ? (
                <span className="label-micro tabular">{pool.data.totalElements} tracked</span>
              ) : undefined
            }
            table={{
              columns: ['Interest', 'Companies'],
              rows: pipeline.map((level) => [level.label, String(level.value)]),
            }}
          >
            {pipeline.length > 0 ? (
              <RankedBars
                items={pipeline}
                format={(value) => pluralize(value, 'company', 'companies')}
              />
            ) : (
              <ChartEmpty message="Nothing in the pool yet. Tracked companies appear here." />
            )}
          </ChartFrame>
        </div>
      )}

      {!isStartup && (
        <ChartFrame
          className="mt-4"
          title="By company"
          description="Every position, ranked by share of the book. Follow-ons are merged into one name."
          stale={ledger.isFetching && !ledger.isLoading}
          aside={
            records.length > 0 ? (
              <span className="label-micro tabular">
                {pluralize(new Set(records.map((record) => record.startupId)).size, 'company', 'companies')}
              </span>
            ) : undefined
          }
          table={{
            columns: ['Company', `Capital (${currency})`],
            rows: records.map((record) => [record.startupName, money(record.amount)]),
          }}
        >
          {records.length > 0 ? (
            <CompanyBreakdown investments={records} currency={currency} />
          ) : (
            <ChartEmpty message="No positions in this range. Widen it, or record an investment." />
          )}
        </ChartFrame>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricCard
          label={isStartup ? 'Capital raised' : 'Capital deployed'}
          value={formatMoney(data.totalAmount, data.currency)}
          hint="Reported by the server across everything, not just this range"
          trend={sparkValues(deployment)}
          accent="var(--viz-1)"
        />
        <MetricCard
          label={isStartup ? 'Committed investors' : 'Portfolio companies'}
          count={{ to: data.entityCount, format: (value) => String(Math.round(value)) }}
          accent="var(--viz-4)"
        />
      </div>
    </>
  )
}
