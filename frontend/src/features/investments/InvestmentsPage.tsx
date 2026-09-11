import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { investmentApi, investmentKeys } from './api'
import { InvestmentStatus, investmentStatusLabels, roundLabels } from './types'
import type { InvestmentDTO } from './types'
import { InvestmentForm } from './InvestmentForm'
import { PageHeader } from '@/components/PageHeader'
import { StatTile } from '@/components/StatTile'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Tabs } from '@/components/ui/Tabs'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { PlusIcon, RocketIcon } from '@/components/icons'
import { formatDate, formatMoney } from '@/lib/constants'

const statusVariants: Record<InvestmentStatus, 'success' | 'secondary' | 'danger'> = {
  [InvestmentStatus.ACTIVE]: 'success',
  [InvestmentStatus.EXITED]: 'secondary',
  [InvestmentStatus.WRITTEN_OFF]: 'danger',
}

type Filter = 'ALL' | InvestmentStatus

export const InvestmentsPage = () => {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [editing, setEditing] = useState<InvestmentDTO | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<InvestmentDTO | null>(null)
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: investmentKeys.all, queryFn: investmentApi.list })

  const remove = useMutation({
    mutationFn: (id: string) => investmentApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.all })
      setDeleting(null)
    },
  })

  const investments = query.data ?? []
  const active = investments.filter((item) => item.status === InvestmentStatus.ACTIVE)
  const deployed = investments.reduce((total, item) => total + item.amount, 0)
  const currency = investments[0]?.currency ?? 'INR'

  const visible = filter === 'ALL' ? investments : investments.filter((i) => i.status === filter)

  const countFor = (status: InvestmentStatus) =>
    investments.filter((item) => item.status === status).length

  return (
    <>
      <PageHeader
        title="Investments"
        description="Positions your firm holds. Conflict Sentinel and Portfolio Pulse both read from this."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Record investment
          </Button>
        }
      />

      {investments.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatTile label="Capital deployed" value={formatMoney(deployed, currency)} />
          <StatTile label="Active holdings" value={active.length} />
          <StatTile label="Exits" value={countFor(InvestmentStatus.EXITED)} />
        </div>
      )}

      {investments.length > 0 && (
        <Tabs
          className="mb-5"
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
          items={[
            { value: 'ALL', label: 'All', count: investments.length },
            {
              value: InvestmentStatus.ACTIVE,
              label: 'Active',
              count: countFor(InvestmentStatus.ACTIVE),
            },
            {
              value: InvestmentStatus.EXITED,
              label: 'Exited',
              count: countFor(InvestmentStatus.EXITED),
            },
            {
              value: InvestmentStatus.WRITTEN_OFF,
              label: 'Written off',
              count: countFor(InvestmentStatus.WRITTEN_OFF),
            },
          ]}
        />
      )}

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<RocketIcon className="h-6 w-6" />}
          title={investments.length === 0 ? 'No investments recorded' : 'Nothing in this bucket'}
          description="Record the positions your firm holds to power the portfolio views."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Record investment
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Company</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Equity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {visible.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={item.startupName} logoUrl={item.startupLogoUrl} size="sm" />
                      <div className="min-w-0">
                        <Link
                          to={`/startups/${item.startupId}`}
                          className="truncate font-medium text-gray-900 hover:text-blue-700 hover:underline"
                        >
                          {item.startupName}
                        </Link>
                        <span className="block text-xs text-gray-500">{item.startupSector}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{roundLabels[item.round]}</TableCell>
                  <TableCell className="text-sm tabular-nums text-gray-900">
                    {formatMoney(item.amount, item.currency)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-gray-600">
                    {item.equityPercentage !== null ? `${item.equityPercentage}%` : '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(item.investmentDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[item.status]}>
                      {investmentStatusLabels[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(item)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setDeleting(item)}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {formOpen && (
        <InvestmentForm
          open
          investment={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Remove investment"
        description={deleting ? `The ${deleting.startupName} position will be deleted.` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={remove.isPending}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
              onClick={() => deleting && remove.mutate(deleting.id)}
              disabled={remove.isPending}
            >
              {remove.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        {remove.isError ? (
          <Alert variant="danger">{errorMessage(remove.error)}</Alert>
        ) : (
          <p className="text-sm text-gray-600">This cannot be undone.</p>
        )}
      </Modal>
    </>
  )
}
