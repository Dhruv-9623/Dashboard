import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { useProfile } from '@/features/profile/useProfile'
import { investmentApi, investmentKeys } from '@/features/investments/api'
import { poolApi, poolKeys } from '@/features/pool/api'
import { opportunityApi, opportunityKeys } from '@/features/deal-triage/api'
import { OpportunityStatus } from '@/features/deal-triage/types'
import { fundingApi, fundingKeys } from '@/features/funding/api'
import { FundingCycleStatus } from '@/features/funding/types'
import { messagingApi, messagingKeys } from '@/features/messaging/api'
import { ConnectionStatus } from '@/features/messaging/types'
import { suggestionApi, suggestionKeys } from '@/features/ai-suggestions/api'
import { SuggestionStatus } from '@/features/ai-suggestions/types'
import { eventApi, eventKeys } from '@/features/events/api'
import { rsvpLabels } from '@/features/events/types'
import { PageHeader } from '@/components/PageHeader'
import { ErrorState } from '@/components/ErrorState'
import { MetricCard } from '@/components/MetricCard'
import { AllocationBar } from '@/components/AllocationBar'
import { DashboardHero, greetingFor } from '@/components/DashboardHero'
import { ChartEmpty, ChartFrame } from '@/components/charts/ChartFrame'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { BarSeries } from '@/components/charts/BarSeries'
import { RankedBars } from '@/components/charts/RankedBars'
import {
  cumulativeDeployed,
  dealsPerQuarter,
  dominantCurrency,
  sectorExposure,
  sparkValues,
} from '@/features/investments/portfolioSeries'
import { AttentionList } from '@/components/AttentionList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { buttonClass } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { AiMark } from '@/components/ai/AiOrb'
import {
  CalendarIcon,
  ChevronRightIcon,
  CoinsIcon,
  InboxIcon,
  MessageIcon,
  PlusIcon,
} from '@/components/icons'
import {
  formatCurrencyTotals,
  formatDateTime,
  formatMoney,
  formatMoneyShort,
  formatMoneyTotals,
  formatDate,
  pluralize,
  stageLabel,
} from '@/lib/constants'
import { useEntrance } from '@/lib/useMotion'

/** A row of metrics that animates in together. */
const MetricRow = ({ children, when }: { children: React.ReactNode; when: unknown }) => {
  const ref = useEntrance<HTMLDivElement>(when)
  return (
    <div ref={ref} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {children}
    </div>
  )
}

const QuickLink = ({
  to,
  Icon,
  title,
  body,
}: {
  to: string
  Icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element
  title: string
  body: string
}) => (
  <Link
    to={to}
    className="group flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-card transition-all hover:border-line-strong hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
  >
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
      <Icon className="size-4" aria-hidden="true" />
    </span>
    <span className="min-w-0">
      <span className="flex items-center gap-1 text-[13px] font-semibold text-ink">
        {title}
        <ChevronRightIcon
          className="size-3.5 text-ink-muted transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
      <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">{body}</span>
    </span>
  </Link>
)

const UpcomingEvents = () => {
  const events = useQuery({ queryKey: eventKeys.all(true), queryFn: () => eventApi.list(true) })
  const upcoming = (events.data ?? []).slice(0, 3)

  if (upcoming.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming events</CardTitle>
        <Link to="/events" className="text-[13px] font-medium text-brand-ink hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-2">
        <ul>
          {upcoming.map((event) => (
            <li key={event.id}>
              <Link
                to="/events"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-sunken text-ink-muted">
                  <CalendarIcon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{event.title}</span>
                  <span className="block text-xs text-ink-muted">{formatDateTime(event.startTime)}</span>
                </span>
                {event.myRsvp && <Badge variant="secondary">{rsvpLabels[event.myRsvp]}</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

/** Connection requests and AI matches — the two things that arrive on their own. */
const Inbound = () => {
  const requests = useQuery({
    queryKey: messagingKeys.connections('incoming'),
    queryFn: () => messagingApi.listConnections('incoming'),
  })

  const suggestions = useQuery({
    queryKey: suggestionKeys.all,
    queryFn: suggestionApi.list,
  })

  const pendingRequests = (requests.data ?? []).filter(
    (request) => request.status === ConnectionStatus.PENDING
  ).length

  const pendingSuggestions = (suggestions.data ?? []).filter(
    (suggestion) => suggestion.status === SuggestionStatus.PENDING
  ).length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waiting on you</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <Link
          to="/messages"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
            <MessageIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1 text-[13px] text-ink">
            {pendingRequests > 0 ? pluralize(pendingRequests, 'connection request') : 'Messages'}
          </span>
          {pendingRequests > 0 && <Badge variant="default">{pendingRequests}</Badge>}
          <ChevronRightIcon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </Link>
        <Link
          to="/suggestions"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken">
            <AiMark />
          </span>
          <span className="min-w-0 flex-1 text-[13px] text-ink">
            {pendingSuggestions > 0
              ? pluralize(pendingSuggestions, 'new match', 'new matches')
              : 'AI suggestions'}
          </span>
          {pendingSuggestions > 0 && <Badge variant="default">{pendingSuggestions}</Badge>}
          <ChevronRightIcon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  )
}

const VCDashboard = () => {
  const { firm } = useProfile()

  // Portfolio figures come from the server: correct across the whole portfolio, not just a page.
  const investments = useQuery({ queryKey: investmentKeys.summary, queryFn: investmentApi.summary })
  // The records themselves, for the derived history below. One page is enough for
  // the charts to be honest about — they say so in their own subtitles.
  const ledgerParams = { size: 100 }
  const ledger = useQuery({
    queryKey: investmentKeys.list(ledgerParams),
    queryFn: () => investmentApi.list(ledgerParams),
  })
  const poolParams = { size: 5 }
  const pool = useQuery({ queryKey: poolKeys.list(poolParams), queryFn: () => poolApi.list(poolParams) })
  const deals = useQuery({
    queryKey: opportunityKeys.list(),
    queryFn: () => opportunityApi.list(),
  })

  const pendingTriage = (deals.data ?? []).filter(
    (deal) => deal.status === OpportunityStatus.PENDING_REVIEW
  ).length

  // A failed load must never render as ₹0 / 0 — that reads as a real, empty portfolio.
  // Only the portfolio queries gate the tiles; a failing triage count shows as "—" beside figures
  // that did load, rather than hiding all of them.
  const statsError = investments.error ?? pool.error
  const summary = investments.data
  const loading = investments.isLoading || pool.isLoading

  const deployed = summary?.totalsByCurrency ?? {}
  const holdings = summary?.activeCount ?? 0
  const tracked = pool.data?.totalElements ?? 0

  // Derived series. A single currency per chart: adding rupees to dollars would
  // be a lie, so each plot states which currency it's showing.
  const records = ledger.data?.items ?? []
  const currency = dominantCurrency(records) ?? 'INR'
  const deploymentSeries = cumulativeDeployed(records, currency)
  const paceSeries = dealsPerQuarter(records)
  const sectors = sectorExposure(records, currency)
  const deployedTrend = sparkValues(deploymentSeries)
  const money = (value: number) => formatMoney(value, currency)
  const moneyTick = (value: number) => formatMoneyShort(value, currency)
  // One currency makes the allocation bar a single full-width segment — a
  // one-bar chart, which the metric card above already says better.
  const multiCurrency = Object.keys(deployed).length > 1

  return (
    <>
      <PageHeader
        title={firm?.name ? `${firm.name} overview` : 'Overview'}
        description="Your portfolio, pipeline, and network at a glance."
        actions={
          <Link to="/deal-triage/new" className={buttonClass()}>
            <PlusIcon className="size-4" aria-hidden="true" />
            New opportunity
          </Link>
        }
      />

      <DashboardHero
        className="mb-4"
        greeting={greetingFor()}
        busy={investments.isLoading || ledger.isFetching}
        headline={
          holdings === 0
            ? 'No positions on the books yet — record your first investment to start the portfolio view.'
            : `${formatCurrencyTotals(deployed)} at work across ${pluralize(holdings, 'company', 'companies')}${
                pendingTriage > 0 ? `, with ${pluralize(pendingTriage, 'opportunity', 'opportunities')} waiting on you.` : '.'
              }`
        }
        facts={[
          ...(sectors.length > 0
            ? [{ label: 'Largest sector', value: `${sectors[0].label} · ${Math.round(sectors[0].share * 100)}%` }]
            : []),
          ...(paceSeries.length > 0
            ? [{ label: 'Deals this quarter', value: String(paceSeries[paceSeries.length - 1].value) }]
            : []),
          ...(records.length > 0
            ? [
                {
                  label: 'Last cheque',
                  value: formatDate(
                    [...records].sort((a, b) => b.investmentDate.localeCompare(a.investmentDate))[0]
                      .investmentDate
                  ),
                },
              ]
            : []),
        ]}
      />

      {statsError ? (
        <ErrorState
          title="Couldn't load your portfolio figures"
          error={statsError}
          onRetry={() => {
            investments.refetch()
            pool.refetch()
          }}
        />
      ) : loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[104px]" />
          ))}
        </div>
      ) : (
        <MetricRow when={`${holdings}-${tracked}`}>
          <MetricCard
            label="Capital deployed"
            value={formatCurrencyTotals(deployed)}
            hint={
              Object.keys(deployed).length > 1
                ? `Across ${Object.keys(deployed).length} currencies`
                : 'Across all active positions'
            }
            trend={deployedTrend}
            accent="var(--viz-1)"
            emphasis
          />
          <MetricCard
            label="Active holdings"
            count={{ to: holdings, format: (value) => String(Math.round(value)) }}
            hint={holdings === 0 ? 'Record your first position' : 'Positions still held'}
            accent="var(--viz-2)"
          />
          <MetricCard
            label="Tracked in pool"
            count={{ to: tracked, format: (value) => String(Math.round(value)) }}
            hint="Companies you're watching"
            accent="var(--viz-3)"
          />
          <MetricCard
            label="Awaiting triage"
            value={deals.isError ? '—' : undefined}
            count={
              deals.isError
                ? undefined
                : { to: pendingTriage, format: (value) => String(Math.round(value)) }
            }
            hint={deals.isError ? "Couldn't load deal triage" : 'Scored, not yet reviewed'}
            tone={!deals.isError && pendingTriage > 0 ? 'notice' : 'default'}
            accent="var(--viz-4)"
          />
        </MetricRow>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <ChartFrame
          title="Capital deployed over time"
          description={`Running total in ${currency}, by the month each cheque was written.`}
          stale={ledger.isFetching && !ledger.isLoading}
          aside={
            deploymentSeries.length > 0 ? (
              <span className="text-[13px] font-semibold tabular text-ink">
                {money(deploymentSeries[deploymentSeries.length - 1].value)}
              </span>
            ) : undefined
          }
          table={{
            columns: ['Month', `Cumulative (${currency})`],
            rows: deploymentSeries.map((point) => [point.label, money(point.value)]),
          }}
        >
          {deploymentSeries.length > 1 ? (
            <AreaTrend
              data={deploymentSeries}
              format={money}
              tickFormat={moneyTick}
              seriesName="Deployed"
            />
          ) : (
            <ChartEmpty message="Two months of investment history draws this curve. Record a position to start it." />
          )}
        </ChartFrame>

        <ChartFrame
          title="Sector exposure"
          description="Active and exited positions by sector, largest first."
          stale={ledger.isFetching && !ledger.isLoading}
          table={{
            columns: ['Sector', `Deployed (${currency})`],
            rows: sectors.map((sector) => [sector.label, money(sector.value)]),
          }}
        >
          {sectors.length > 0 ? (
            <RankedBars items={sectors} format={money} />
          ) : (
            <ChartEmpty message="Sector mix appears once you hold a position." />
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
            rows: paceSeries.map((point) => [point.label, String(point.value)]),
          }}
        >
          {paceSeries.length > 1 ? (
            <BarSeries data={paceSeries} format={(value) => String(value)} seriesName="Deals" color="var(--viz-2)" />
          ) : (
            <ChartEmpty message="Pace appears once you have deals across more than one quarter." />
          )}
        </ChartFrame>

        {multiCurrency ? (
          <AllocationBar
            title="Where the money is"
            description="Active positions by currency, largest first."
            segments={Object.entries(deployed).map(([code, total], index) => ({
              label: code,
              value: total,
              formatted: formatMoney(total, code),
              color: `var(--viz-${(index % 6) + 1})`,
            }))}
            emptyMessage="No active positions yet. Recording an investment fills this in."
          />
        ) : (
          <Inbound />
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <AttentionList
          title="Needs a decision"
          items={[
            ...(pendingTriage > 0
              ? [
                  {
                    id: 'triage',
                    to: '/deal-triage',
                    icon: <InboxIcon className="size-4" aria-hidden="true" />,
                    title: pluralize(pendingTriage, 'opportunity', 'opportunities') + ' scored and waiting',
                    meta: 'Deal Triage',
                    tone: 'notice' as const,
                  },
                ]
              : []),
            ...(pool.data?.items ?? []).slice(0, 4).map((entry) => ({
              id: entry.id,
              to: '/pool',
              icon: <EntityAvatar name={entry.companyName ?? 'Company'} size="sm" />,
              title: entry.companyName ?? 'Tracked company',
              // stageLabel, not the raw enum: the API sends SERIES_A, the reader wants "Series A".
              meta:
                [entry.sector, entry.stage ? stageLabel(entry.stage) : null]
                  .filter(Boolean)
                  .join(' · ') || 'In your pool',
              tone: entry.interestLevel === 'HIGH_PRIORITY' ? ('brand' as const) : ('default' as const),
            })),
          ]}
          emptyMessage="Nothing waiting. Add companies to your pool to build a pipeline."
        />

        <div className="grid gap-3 content-start">
          {multiCurrency && <Inbound />}
          <QuickLink
            to="/deal-flow"
            Icon={CoinsIcon}
            title="Deal Flow"
            body="Startups actively raising that match your sector and stage."
          />
          <QuickLink
            to="/investments"
            Icon={CalendarIcon}
            title="Investments"
            body="Positions you hold, and the source for Conflict Sentinel and Pulse."
          />
          <UpcomingEvents />
        </div>
      </div>
    </>
  )
}

const StartupDashboard = () => {
  const { startup } = useProfile()

  const cycles = useQuery({ queryKey: fundingKeys.mine, queryFn: fundingApi.listMine })

  const rounds = cycles.data ?? []
  const open = rounds.find((cycle) => cycle.status === FundingCycleStatus.OPEN)
  const committedByRound = rounds.map((cycle) => ({ amount: cycle.committedAmount, currency: cycle.currency }))
  const progress = open && open.targetAmount ? (open.committedAmount / open.targetAmount) * 100 : 0

  return (
    <>
      <PageHeader
        title={startup?.name ? `${startup.name} overview` : 'Overview'}
        description="Your round, your investors, and who's looking at your profile."
        actions={
          <Link to="/funding" className={buttonClass()}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Manage round
          </Link>
        }
      />

      <DashboardHero
        className="mb-4"
        greeting={greetingFor()}
        busy={cycles.isFetching}
        headline={
          open
            ? `${formatMoney(open.committedAmount, open.currency)} committed of ${formatMoney(
                open.targetAmount,
                open.currency
              )} on your open ${open.roundType} round.`
            : 'No round open right now — open one to start taking commitments.'
        }
        facts={[
          { label: 'Rounds run', value: String(rounds.length) },
          ...(open ? [{ label: 'Investors committed', value: String(open.commitmentCount) }] : []),
          ...(open ? [{ label: 'Progress', value: `${Math.round(progress)}%` }] : []),
        ]}
      />

      {cycles.isError ? (
        <ErrorState
          title="Couldn't load your funding rounds"
          error={cycles.error}
          onRetry={() => cycles.refetch()}
        />
      ) : cycles.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[104px]" />
          ))}
        </div>
      ) : (
        <MetricRow when={rounds.length}>
          <MetricCard
            label="Total committed"
            value={formatMoneyTotals(committedByRound)}
            hint={open ? `Toward ${formatMoney(open.targetAmount, open.currency)}` : 'Across all rounds'}
            accent="var(--viz-2)"
            emphasis
          />
          <MetricCard
            label="Current round"
            value={open?.roundType ?? '—'}
            hint={open ? 'Open to investors' : 'No round open'}
            accent="var(--viz-1)"
          />
          <MetricCard
            label="Investors committed"
            count={{ to: open?.commitmentCount ?? 0, format: (value) => String(Math.round(value)) }}
            hint="On the open round"
            accent="var(--viz-3)"
          />
          <MetricCard
            label="Rounds run"
            count={{ to: rounds.length, format: (value) => String(Math.round(value)) }}
            hint="Including closed"
            accent="var(--viz-5)"
          />
        </MetricRow>
      )}

      {open && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <AllocationBar
            title={`${open.roundType} progress`}
            description={`${formatMoney(open.committedAmount, open.currency)} committed of ${formatMoney(
              open.targetAmount,
              open.currency
            )}`}
            segments={[
              {
                label: 'Committed',
                value: open.committedAmount,
                formatted: `${Math.round(progress)}%`,
                color: 'var(--viz-2)',
              },
              {
                label: 'Remaining',
                value: Math.max(open.targetAmount - open.committedAmount, 0),
                formatted: formatMoney(Math.max(open.targetAmount - open.committedAmount, 0), open.currency),
                color: 'var(--line-strong)',
              },
            ]}
            emptyMessage="No commitments yet."
          />
          <Inbound />
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <QuickLink
          to="/funding"
          Icon={CoinsIcon}
          title="Funding rounds"
          body="Open a round, set ticket sizes, and track commitments as they firm up."
        />
        <QuickLink
          to="/discover"
          Icon={CalendarIcon}
          title="Discover investors"
          body="Find firms whose stage and sector match the round you're raising."
        />
      </div>

      <div className="mt-4">
        <UpcomingEvents />
      </div>
    </>
  )
}

export const DashboardPage = () => {
  const { user } = useAuth()
  return user?.userType === UserType.STARTUP ? <StartupDashboard /> : <VCDashboard />
}
