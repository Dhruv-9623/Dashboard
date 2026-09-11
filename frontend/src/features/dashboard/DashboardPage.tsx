import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { useProfile } from '@/features/profile/useProfile'
import { investmentApi, investmentKeys } from '@/features/investments/api'
import { InvestmentStatus } from '@/features/investments/types'
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
import { PageHeader } from '@/components/PageHeader'
import { StatTile } from '@/components/StatTile'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  CalendarIcon,
  ChevronRightIcon,
  CoinsIcon,
  InboxIcon,
  MessageIcon,
  PlusIcon,
  SparkIcon,
} from '@/components/icons'
import { formatDateTime, formatMoney } from '@/lib/constants'

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
    className="group rounded-lg border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
  >
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
      <Icon className="h-5 w-5" />
    </div>
    <h2 className="flex items-center gap-1 text-base font-semibold text-gray-900">
      {title}
      <ChevronRightIcon className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" />
    </h2>
    <p className="mt-1.5 text-sm text-gray-500">{body}</p>
  </Link>
)

const UpcomingEvents = () => {
  const events = useQuery({ queryKey: eventKeys.all(true), queryFn: () => eventApi.list(true) })
  const upcoming = (events.data ?? []).slice(0, 3)

  if (upcoming.length === 0) return null

  return (
    <Card className="mt-6">
      <CardContent className="py-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Upcoming events</h2>
          <Link to="/events" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <ul className="space-y-2">
          {upcoming.map((event) => (
            <li
              key={event.id}
              className="flex items-center gap-3 rounded border border-gray-200 px-3 py-2"
            >
              <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{event.title}</p>
                <p className="text-xs text-gray-500">{formatDateTime(event.startTime)}</p>
              </div>
              {event.myRsvp && <Badge variant="secondary">{event.myRsvp}</Badge>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

const SharedSignals = () => {
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
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <QuickLink
        to="/messages"
        Icon={MessageIcon}
        title={pendingRequests > 0 ? `${pendingRequests} connection request(s)` : 'Messages'}
        body="Chat unlocks once both sides accept a connection."
      />
      <QuickLink
        to="/suggestions"
        Icon={SparkIcon}
        title={pendingSuggestions > 0 ? `${pendingSuggestions} new match(es)` : 'AI Suggestions'}
        body="Matches generated from your profile and activity."
      />
    </div>
  )
}

const VCDashboard = () => {
  const { firm } = useProfile()

  const investments = useQuery({ queryKey: investmentKeys.all, queryFn: investmentApi.list })
  const pool = useQuery({ queryKey: poolKeys.all, queryFn: poolApi.list })
  const deals = useQuery({
    queryKey: opportunityKeys.list(),
    queryFn: () => opportunityApi.list(),
  })

  const holdings = investments.data ?? []
  const active = holdings.filter((item) => item.status === InvestmentStatus.ACTIVE)
  const deployed = holdings.reduce((total, item) => total + item.amount, 0)
  const pendingTriage = (deals.data ?? []).filter(
    (deal) => deal.status === OpportunityStatus.PENDING_REVIEW
  ).length

  return (
    <>
      <PageHeader
        title={firm?.name ? `${firm.name} overview` : 'Overview'}
        description="Your portfolio, pipeline, and network at a glance."
        actions={
          <Link to="/deal-triage/new">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              New opportunity
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {investments.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)
        ) : (
          <>
            <StatTile
              label="Capital deployed"
              value={formatMoney(deployed, holdings[0]?.currency ?? 'INR')}
            />
            <StatTile label="Active holdings" value={active.length} />
            <StatTile label="Tracked in pool" value={pool.data?.length ?? '—'} />
            <StatTile
              label="Awaiting triage"
              value={pendingTriage}
              tone={pendingTriage > 0 ? 'amber' : 'default'}
            />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <QuickLink
          to="/deal-flow"
          Icon={CoinsIcon}
          title="Deal Flow"
          body="Startups actively raising that match your sector and stage filters."
        />
        <QuickLink
          to="/deal-triage"
          Icon={InboxIcon}
          title="Deal Triage"
          body="Opportunities scored against your thesis, with cited rationale."
        />
        <QuickLink
          to="/investments"
          Icon={CalendarIcon}
          title="Investments"
          body="Positions you hold, and the source for Conflict Sentinel and Pulse."
        />
      </div>

      <SharedSignals />
      <UpcomingEvents />
    </>
  )
}

const StartupDashboard = () => {
  const { startup } = useProfile()

  const cycles = useQuery({ queryKey: fundingKeys.mine, queryFn: fundingApi.listMine })

  const rounds = cycles.data ?? []
  const open = rounds.find((cycle) => cycle.status === FundingCycleStatus.OPEN)
  const raised = rounds.reduce((total, cycle) => total + cycle.committedAmount, 0)

  return (
    <>
      <PageHeader
        title={startup?.name ? `${startup.name} overview` : 'Overview'}
        description="Your round, your investors, and who's looking at your profile."
        actions={
          <Link to="/funding">
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Manage round
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cycles.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24" />)
        ) : (
          <>
            <StatTile
              label="Total committed"
              value={formatMoney(raised, rounds[0]?.currency ?? 'INR')}
            />
            <StatTile label="Current round" value={open?.roundType ?? '—'} />
            <StatTile label="Investors committed" value={open?.commitmentCount ?? 0} />
            <StatTile label="Rounds run" value={rounds.length} />
          </>
        )}
      </div>

      {open && (
        <Card className="mt-6">
          <CardContent className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-gray-900">{open.roundType} progress</h2>
              <span className="text-sm text-gray-500">
                {formatMoney(open.committedAmount, open.currency)} of{' '}
                {formatMoney(open.targetAmount, open.currency)}
              </span>
            </div>
            <Progress
              className="mt-3"
              value={open.targetAmount ? (open.committedAmount / open.targetAmount) * 100 : 0}
              tone="green"
            />
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <QuickLink
          to="/funding"
          Icon={CoinsIcon}
          title="Funding Rounds"
          body="Open a round, set ticket sizes, and track commitments as they firm up."
        />
        <QuickLink
          to="/discover"
          Icon={CalendarIcon}
          title="Discover Investors"
          body="Find firms whose stage and sector match the round you're raising."
        />
      </div>

      <SharedSignals />
      <UpcomingEvents />
    </>
  )
}

export const DashboardPage = () => {
  const { user } = useAuth()
  return user?.userType === UserType.STARTUP ? <StartupDashboard /> : <VCDashboard />
}
