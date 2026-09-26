import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { investmentApi, investmentKeys } from './api'
import { InvestmentStatus, investmentStatusLabels, roundLabels } from './types'
import type { InvestmentDTO } from './types'
import { InvestmentForm } from './InvestmentForm'
import { PageHeader } from '@/components/PageHeader'
import { MetricCard } from '@/components/MetricCard'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RowActions } from '@/components/ui/RowActions'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { useToast } from '@/components/ui/Toast'
import { Tabs } from '@/components/ui/Tabs'
import { SkeletonRows } from '@/components/ui/Skeleton'
import {
  SortableHead,
  Table,
  TableBody,
  TableCard,
  TableCardField,
  TableCardList,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from '@/components/ui/Table'
import type { SortDirection } from '@/components/ui/Table'
import { PlusIcon, RocketIcon, TrashIcon } from '@/components/icons'
import { formatCurrencyTotals, formatDate, formatMoney } from '@/lib/constants'
import { useEntrance, useOrderTransition } from '@/lib/useMotion'

const statusVariants: Record<InvestmentStatus, 'success' | 'secondary' | 'danger'> = {
  [InvestmentStatus.ACTIVE]: 'success',
  [InvestmentStatus.EXITED]: 'secondary',
  [InvestmentStatus.WRITTEN_OFF]: 'danger',
}

type Filter = 'ALL' | InvestmentStatus
type SortKey = 'company' | 'amount' | 'equity' | 'date'

const PAGE_SIZE = 20

/**
 * Sorting is client-side, over the page in hand.
 *
 * That is a deliberate limit, not an oversight: the backend's list endpoint pages
 * without a sort parameter, so sorting the whole portfolio would need an API
 * change. Within a page it's honest — and the footer totals come from the
 * server's summary, so no figure depends on the order.
 */
function sortRows(rows: InvestmentDTO[], key: SortKey, direction: SortDirection) {
  const sign = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (key) {
      case 'company':
        return sign * a.startupName.localeCompare(b.startupName)
      case 'amount':
        return sign * (a.amount - b.amount)
      case 'equity':
        return sign * ((a.equityPercentage ?? -1) - (b.equityPercentage ?? -1))
      case 'date':
        return sign * (Date.parse(a.investmentDate) - Date.parse(b.investmentDate))
    }
  })
}

export const InvestmentsPage = () => {
  const [filter, setFilter] = useState<Filter>('ALL')
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'date',
    direction: 'desc',
  })
  const [editing, setEditing] = useState<InvestmentDTO | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<InvestmentDTO | null>(null)
  const queryClient = useQueryClient()
  const toast = useToast()

  const listParams = { status: filter === 'ALL' ? undefined : filter, page, size: PAGE_SIZE }
  const query = useQuery({
    queryKey: investmentKeys.list(listParams),
    queryFn: () => investmentApi.list(listParams),
    placeholderData: keepPreviousData,
  })
  // Portfolio-wide figures come from the server so they stay right when the list is paged.
  const summary = useQuery({ queryKey: investmentKeys.summary, queryFn: investmentApi.summary })

  const remove = useMutation({
    mutationFn: (id: string) => investmentApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.all })
      toast.success(deleting ? `Removed the ${deleting.startupName} investment` : 'Investment removed')
      setDeleting(null)
    },
  })

  const rows = query.data?.items ?? []
  const visible = useMemo(() => sortRows(rows, sort.key, sort.direction), [rows, sort])
  const totals = summary.data
  const hasAny = (totals?.totalCount ?? 0) > 0

  // Rows glide to their new positions when the sort changes, instead of teleporting.
  const tableRef = useOrderTransition<HTMLTableElement>(`${sort.key}-${sort.direction}`)
  const cardsRef = useEntrance<HTMLUListElement>(page)

  // The page in hand, which is what the footer aggregates describe.
  const pageTotal = visible.reduce<Record<string, number>>((acc, item) => {
    acc[item.currency] = (acc[item.currency] ?? 0) + item.amount
    return acc
  }, {})

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'company' ? 'asc' : 'desc' }
    )

  const changeFilter = (value: Filter) => {
    setFilter(value)
    setPage(0)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (item: InvestmentDTO) => {
    setEditing(item)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Investments"
        description="Positions your firm holds. Conflict Sentinel and Portfolio Pulse both read from this."
        meta={
          hasAny ? (
            <Badge variant="secondary" className="tabular">
              {totals?.totalCount} total
            </Badge>
          ) : undefined
        }
        actions={
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Record investment
          </Button>
        }
      />

      {totals && hasAny && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Capital deployed"
            value={formatCurrencyTotals(totals.totalsByCurrency)}
            hint="Every position on record"
            accent="var(--viz-1)"
          />
          <MetricCard
            label="Active holdings"
            count={{ to: totals.activeCount, format: (value) => String(Math.round(value)) }}
            accent="var(--viz-2)"
          />
          <MetricCard
            label="Exits"
            count={{ to: totals.exitedCount, format: (value) => String(Math.round(value)) }}
            hint={totals.writtenOffCount > 0 ? `${totals.writtenOffCount} written off` : undefined}
            accent="var(--viz-3)"
          />
        </div>
      )}

      {totals && hasAny && (
        <Tabs
          className="mb-3"
          label="Investment status"
          value={filter}
          onChange={(value) => changeFilter(value as Filter)}
          items={[
            { value: 'ALL', label: 'All', count: totals.totalCount },
            { value: InvestmentStatus.ACTIVE, label: 'Active', count: totals.activeCount },
            { value: InvestmentStatus.EXITED, label: 'Exited', count: totals.exitedCount },
            { value: InvestmentStatus.WRITTEN_OFF, label: 'Written off', count: totals.writtenOffCount },
          ]}
        />
      )}

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<RocketIcon className="size-6" />}
          title={hasAny ? 'Nothing in this bucket' : 'No investments recorded'}
          description="Record the positions your firm holds to power the portfolio views."
          action={
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" aria-hidden="true" />
              Record investment
            </Button>
          }
        />
      ) : (
        <>
          {/* Phone: one card per position. A seven-column table can't reflow
              honestly at 375px, and a horizontal scroll hides the amounts. */}
          <TableCardList ref={cardsRef}>
            {visible.map((item) => (
              <TableCard key={item.id}>
                <div className="flex items-start gap-3">
                  <EntityAvatar name={item.startupName} logoUrl={item.startupLogoUrl} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/startups/${item.startupId}`}
                      className="block truncate text-sm font-medium text-ink hover:text-brand-ink hover:underline"
                    >
                      {item.startupName}
                    </Link>
                    <p className="truncate text-xs text-ink-muted">{item.startupSector}</p>
                  </div>
                  <Badge variant={statusVariants[item.status]} dot>
                    {investmentStatusLabels[item.status]}
                  </Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3">
                  <TableCardField label="Amount">{formatMoney(item.amount, item.currency)}</TableCardField>
                  <TableCardField label="Equity">
                    {item.equityPercentage !== null ? `${item.equityPercentage.toFixed(2)}%` : '—'}
                  </TableCardField>
                  <TableCardField label="Round">{roundLabels[item.round]}</TableCardField>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-xs text-ink-muted">{formatDate(item.investmentDate)}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(item)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </TableCard>
            ))}
          </TableCardList>

          <TableSurface className="max-sm:hidden">
            <Table ref={tableRef}>
              <TableHeader>
                <tr className="group/head">
                  <SortableHead
                    active={sort.key === 'company'}
                    direction={sort.direction}
                    onSort={() => toggleSort('company')}
                  >
                    Company
                  </SortableHead>
                  <TableHead>Round</TableHead>
                  <SortableHead
                    numeric
                    active={sort.key === 'amount'}
                    direction={sort.direction}
                    onSort={() => toggleSort('amount')}
                  >
                    Amount
                  </SortableHead>
                  <SortableHead
                    numeric
                    active={sort.key === 'equity'}
                    direction={sort.direction}
                    onSort={() => toggleSort('equity')}
                  >
                    Equity
                  </SortableHead>
                  <SortableHead
                    active={sort.key === 'date'}
                    direction={sort.direction}
                    onSort={() => toggleSort('date')}
                  >
                    Date
                  </SortableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {visible.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <EntityAvatar name={item.startupName} logoUrl={item.startupLogoUrl} size="sm" />
                        <div className="min-w-0">
                          <Link
                            to={`/startups/${item.startupId}`}
                            className="block truncate font-medium text-ink hover:text-brand-ink hover:underline"
                          >
                            {item.startupName}
                          </Link>
                          <span className="block truncate text-xs text-ink-muted">
                            {item.startupSector}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell muted>{roundLabels[item.round]}</TableCell>
                    <TableCell numeric className="font-medium">
                      {formatMoney(item.amount, item.currency)}
                    </TableCell>
                    <TableCell numeric muted>
                      {/* Fixed decimals, so a column of percentages lines up. */}
                      {item.equityPercentage !== null ? `${item.equityPercentage.toFixed(2)}%` : '—'}
                    </TableCell>
                    <TableCell muted className="whitespace-nowrap">
                      {formatDate(item.investmentDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[item.status]} dot>
                        {investmentStatusLabels[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={`Actions for ${item.startupName}`}
                        actions={[
                          { label: 'Edit position', onSelect: () => openEdit(item) },
                          {
                            label: 'View company',
                            onSelect: () => undefined,
                            to: `/startups/${item.startupId}`,
                          },
                          {
                            label: 'Remove',
                            destructive: true,
                            icon: <TrashIcon className="size-4" aria-hidden="true" />,
                            onSelect: () => setDeleting(item),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <tr>
                  <td colSpan={2} className="px-4">
                    {visible.length} on this page
                  </td>
                  <td className="px-4 text-right tabular font-medium text-ink">
                    {formatCurrencyTotals(pageTotal)}
                  </td>
                  <td colSpan={4} className="px-4 text-right text-ink-muted">
                    {totals ? `${formatCurrencyTotals(totals.totalsByCurrency)} in total` : ''}
                  </td>
                </tr>
              </TableFooter>
            </Table>
          </TableSurface>
        </>
      )}

      {query.data && (
        <Pagination
          page={query.data.page}
          totalPages={query.data.totalPages}
          totalElements={query.data.totalElements}
          size={query.data.size}
          onPageChange={setPage}
          label="investments"
        />
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

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove investment"
        description={deleting ? `The ${deleting.startupName} position will be deleted.` : undefined}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onCancel={() => {
          setDeleting(null)
          remove.reset()
        }}
      />
    </>
  )
}
