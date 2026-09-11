import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { startupApi, startupKeys } from '@/features/startup/api'
import { vcFirmApi } from '@/features/vc-firm/api'
import { useWishlistToggle } from '@/features/wishlist/useWishlistToggle'
import { WishlistTargetType } from '@/features/wishlist/types'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { HeartIcon, ScaleIcon, SearchIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { sectorOptions, stageLabel, STAGES } from '@/lib/constants'

const StartupDiscovery = () => {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')
  const [stage, setStage] = useState('')
  const [raisingOnly, setRaisingOnly] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const navigate = useNavigate()

  const params = { search, sector, stage, raisingOnly }

  const query = useQuery({
    queryKey: startupKeys.search(params),
    queryFn: () => startupApi.search(params),
  })

  const { isSaved, toggle: toggleWishlist } = useWishlistToggle(WishlistTargetType.STARTUP)

  const toggleCompare = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]
    )

  const startups = query.data ?? []

  return (
    <>
      <PageHeader
        title="Discover Startups"
        description="Search the platform by sector, stage, and whether they're actively raising."
        actions={
          selected.length > 1 ? (
            <Button onClick={() => navigate(`/compare?ids=${selected.join(',')}`)}>
              <ScaleIcon className="mr-2 h-4 w-4" />
              Compare {selected.length}
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name…"
          />
        </div>
        <div className="w-44">
          <Select
            options={[{ value: '', label: 'All sectors' }, ...sectorOptions]}
            value={sector}
            onChange={(event) => setSector(event.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={[
              { value: '', label: 'All stages' },
              ...STAGES.map((entry) => ({ value: entry.value, label: entry.label })),
            ]}
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          />
        </div>
        <Button
          variant={raisingOnly ? 'primary' : 'outline'}
          onClick={() => setRaisingOnly((prev) => !prev)}
        >
          Raising now
        </Button>
      </div>

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : startups.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title="No startups found"
          description="Try clearing a filter or searching a different term."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {startups.map((startup) => (
            <Card key={startup.id} className={cn(selected.includes(startup.id) && 'ring-2 ring-blue-500')}>
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <Avatar name={startup.name} logoUrl={startup.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/startups/${startup.id}`}
                      className="block truncate font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                    >
                      {startup.name}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {startup.sector} · {stageLabel(startup.stage)}
                    </p>
                  </div>
                  <button
                    type="button"
                    title={isSaved(startup.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                    onClick={() => toggleWishlist.mutate(startup.id)}
                    className={cn(
                      'rounded p-1.5 transition-colors',
                      isSaved(startup.id)
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                    )}
                  >
                    <HeartIcon className="h-4.5 w-4.5" />
                  </button>
                </div>

                {startup.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">{startup.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {startup.isRaising && <Badge variant="success">Raising</Badge>}
                  {startup.location && <Badge variant="secondary">{startup.location}</Badge>}
                </div>

                <Button
                  variant={selected.includes(startup.id) ? 'primary' : 'outline'}
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => toggleCompare(startup.id)}
                >
                  {selected.includes(startup.id) ? 'Selected to compare' : 'Add to compare'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

const InvestorDiscovery = () => {
  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: ['vc-firms', 'search', search],
    queryFn: () => vcFirmApi.searchFirms(search || undefined),
  })

  const { isSaved, toggle: toggleWishlist } = useWishlistToggle(WishlistTargetType.VC_FIRM)

  const firms = query.data ?? []

  return (
    <>
      <PageHeader
        title="Discover Investors"
        description="Find VC firms whose stage, sector, and cheque size match your round."
      />

      <div className="mb-5 max-w-md">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search firms…"
        />
      </div>

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : firms.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-6 w-6" />}
          title="No firms found"
          description="Try a different search term."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {firms.map((firm) => (
            <Card key={firm.id}>
              <CardContent className="py-5">
                <div className="flex items-start gap-3">
                  <Avatar name={firm.name} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/firms/${firm.id}`}
                      className="block truncate font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                    >
                      {firm.name}
                    </Link>
                    {firm.location && <p className="text-xs text-gray-500">{firm.location}</p>}
                  </div>
                  <button
                    type="button"
                    title={isSaved(firm.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                    onClick={() => toggleWishlist.mutate(firm.id)}
                    className={cn(
                      'rounded p-1.5 transition-colors',
                      isSaved(firm.id)
                        ? 'text-red-500 hover:bg-red-50'
                        : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500'
                    )}
                  >
                    <HeartIcon className="h-4.5 w-4.5" />
                  </button>
                </div>

                {firm.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">{firm.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {firm.sectors?.slice(0, 3).map((entry) => (
                    <Badge key={entry} variant="secondary">
                      {entry}
                    </Badge>
                  ))}
                  {firm.investmentStage && <Badge>{firm.investmentStage}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

export const DiscoverPage = () => {
  const { user } = useAuth()
  return user?.userType === UserType.STARTUP ? <InvestorDiscovery /> : <StartupDiscovery />
}
