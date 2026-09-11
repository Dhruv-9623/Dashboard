import { Suspense, lazy } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { queryClient } from '@/lib/query-client'
import { Loading } from '@/components/Loading'
import { LandingPage } from '@/routes/LandingPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { RequireEntity, RequireNoEntity } from '@/routes/OnboardingGuards'
import { AccountTypeSelectionPage } from '@/features/auth/AccountTypeSelectionPage'
import { AppShell } from '@/components/layout/AppShell'

// Feature screens load on demand so the initial bundle carries only the shell
// and the pre-auth routes.
const named = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, key: K) =>
  lazy(async () => ({ default: (await loader())[key] }))

const SetupFirmPage = named(() => import('@/features/onboarding/SetupFirmPage'), 'SetupFirmPage')
const SetupStartupPage = named(() => import('@/features/onboarding/SetupStartupPage'), 'SetupStartupPage')
const DashboardPage = named(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage')
const InsightsPage = named(() => import('@/features/insights/InsightsPage'), 'InsightsPage')
const InvestmentsPage = named(() => import('@/features/investments/InvestmentsPage'), 'InvestmentsPage')
const PoolPage = named(() => import('@/features/pool/PoolPage'), 'PoolPage')
const DealFlowPage = named(() => import('@/features/funding/DealFlowPage'), 'DealFlowPage')
const FundingPage = named(() => import('@/features/funding/FundingPage'), 'FundingPage')
const DiscoverPage = named(() => import('@/features/discovery/DiscoverPage'), 'DiscoverPage')
const ComparisonPage = named(() => import('@/features/comparison/ComparisonPage'), 'ComparisonPage')
const OutreachPage = named(() => import('@/features/outreach/OutreachPage'), 'OutreachPage')
const MessagesPage = named(() => import('@/features/messaging/MessagesPage'), 'MessagesPage')
const WishlistPage = named(() => import('@/features/wishlist/WishlistPage'), 'WishlistPage')
const EventsPage = named(() => import('@/features/events/EventsPage'), 'EventsPage')
const SignalsPage = named(() => import('@/features/signals/SignalsPage'), 'SignalsPage')
const SuggestionsPage = named(() => import('@/features/ai-suggestions/SuggestionsPage'), 'SuggestionsPage')
const StartupDetailPage = named(() => import('@/features/startup/StartupDetailPage'), 'StartupDetailPage')
const VCFirmDetailPage = named(() => import('@/features/vc-firm/VCFirmDetailPage'), 'VCFirmDetailPage')
const ReviewQueuePage = named(() => import('@/features/deal-triage/ReviewQueuePage'), 'ReviewQueuePage')
const NewOpportunityPage = named(() => import('@/features/deal-triage/NewOpportunityPage'), 'NewOpportunityPage')
const OpportunityDetailPage = named(() => import('@/features/deal-triage/OpportunityDetailPage'), 'OpportunityDetailPage')
const ConflictSentinelPage = named(() => import('@/features/conflict-sentinel/ConflictSentinelPage'), 'ConflictSentinelPage')
const PulsePage = named(() => import('@/features/portfolio/PulsePage'), 'PulsePage')
const SettingsPage = named(() => import('@/features/settings/SettingsPage'), 'SettingsPage')

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/account-type-selection" element={<AccountTypeSelectionPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <RequireNoEntity />
                </ProtectedRoute>
              }
            >
              <Route path="/onboarding/firm" element={<SetupFirmPage />} />
              <Route path="/onboarding/startup" element={<SetupStartupPage />} />
            </Route>

            <Route
              element={
                <ProtectedRoute>
                  <RequireEntity />
                </ProtectedRoute>
              }
            >
              <Route element={<AppShell />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/insights" element={<InsightsPage />} />

                {/* VC side */}
                <Route path="/investments" element={<InvestmentsPage />} />
                <Route path="/pool" element={<PoolPage />} />
                <Route path="/deal-flow" element={<DealFlowPage />} />
                <Route path="/outreach" element={<OutreachPage />} />
                <Route path="/deal-triage" element={<ReviewQueuePage />} />
                <Route path="/deal-triage/new" element={<NewOpportunityPage />} />
                <Route path="/deal-triage/:id" element={<OpportunityDetailPage />} />
                <Route path="/conflict-sentinel" element={<ConflictSentinelPage />} />
                <Route path="/pulse" element={<PulsePage />} />
                <Route path="/compare" element={<ComparisonPage />} />

                {/* Startup side */}
                <Route path="/funding" element={<FundingPage />} />

                {/* Shared */}
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/signals" element={<SignalsPage />} />
                <Route path="/suggestions" element={<SuggestionsPage />} />
                <Route path="/startups/:id" element={<StartupDetailPage />} />
                <Route path="/firms/:id" element={<VCFirmDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
