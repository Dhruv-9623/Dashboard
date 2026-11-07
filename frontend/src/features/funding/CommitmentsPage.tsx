import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { fundingApi, fundingKeys } from './api'
import {
  CommitmentStatus,
  commitmentStatusLabels,
  commitmentStatusVariants,
  isConvertible,
  isConverted,
  isLive,
} from './types'
import type { FundingCommitmentDTO } from './types'
import { roundLabel } from '@/features/investments/types'
import { PageHeader } from '@/components/PageHeader'
import { MetricCard } from '@/components/MetricCard'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { RowActions } from '@/components/ui/RowActions'
import { Badge } from '@/components/ui/Badge'
import { Button, buttonClass } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { Pagination } from '@/components/ui/Pagination'
import { Tabs } from '@/components/ui/Tabs'
import { SkeletonRows } from '@/components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCard,
  TableCardField,
  TableCardList,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from '@/components/ui/Table'
import { BankIcon, CoinsIcon, TrashIcon } from '@/components/icons'
import { formatCurrencyTotals, formatDate, formatMoney, pluralize } from '@/lib/constants'
import { useDocumentTitle } from '@/lib/useDocumentTitle'
import { useEntrance } from '@/lib/useMotion'

type Filter = 'ALL' | CommitmentStatus

const PAGE_SIZE = 20

/**
 * Recording a closed round's pledge as a portfolio row.
 *
 * Only equity, date and notes are asked for. The amount, currency and round come from the pledge
 * itself and the server will not accept them from here, so there is nothing to type wrong — and
 * the figure in the heading is the one that will be written.
 */
const ConvertDialog = ({
  commitment,
  onClose,
}: {
  commitment: FundingCommitmentDTO
  onClose: () => void
}) => {
  const queryClient = useQueryClient()

  /** yyyy-mm-dd, which is what a date input wants. */
  const asDateValue = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
  const today = asDateValue(new Date().toISOString())

  const [form, setForm] = useState({
    equityPercentage: '',
    // Prefilled with the day the round closed, which the hint underneath promises. It used to say
    // that and leave the field empty, so the default was invisible until you submitted.
    investmentDate: asDateValue(commitment.cycleClosedAt),
    notes: '',
  })

  const futureDate = Boolean(form.investmentDate) && form.investmentDate > today

  const convert = useMutation({
    // Reported inside the dialog, so it opts out of the global error toast.
    meta: { errorToast: false },
    mutationFn: () =>
      fundingApi.convert(commitment.id, {
        equityPercentage: form.equityPercentage ? Number(form.equityPercentage) : undefined,
        investmentDate: form.investmentDate || undefined,
        notes: form.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commitments'] })
      // A portfolio row now exists, so the investments list and its totals are both stale.
      queryClient.invalidateQueries({ queryKey: ['investments'] })
      // And the round's own view, which a founder may be looking at.
      queryClient.invalidateQueries({ queryKey: ['funding-cycles'] })
      onClose()
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title="Record as investment"
      description={`${formatMoney(commitment.amount, commitment.currency)} into ${commitment.startupName}'s ${roundLabel(commitment.roundType)} round.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={convert.isPending}>
            Cancel
          </Button>
          <Button
            form="convert-form"
            type="submit"
            disabled={convert.isPending || futureDate}
          >
            {convert.isPending ? 'Recording…' : 'Record investment'}
          </Button>
        </>
      }
    >
      <form
        id="convert-form"
        onSubmit={(event) => {
          event.preventDefault()
          convert.mutate()
        }}
        className="space-y-4"
      >
        <p className="text-sm text-ink-secondary">
          This adds a row to your portfolio for the amount you pledged, and the pledge stays on the
          round&apos;s record so the founder keeps their history. It stops counting here once
          it&apos;s recorded, so the money is never in both places at once.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="convert-equity">Equity received (%)</Label>
            <Input
              id="convert-equity"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.equityPercentage}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, equityPercentage: event.target.value }))
              }
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="convert-date">Investment date</Label>
            <Input
              id="convert-date"
              type="date"
              // The server refuses a future date; the picker shouldn't offer one.
              max={today}
              value={form.investmentDate}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, investmentDate: event.target.value }))
              }
            />
            <p className="mt-1 text-xs text-ink-muted">The day the round closed.</p>
          </div>
        </div>

        <div>
          <Label htmlFor="convert-notes">Notes</Label>
          <Input
            id="convert-notes"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Optional"
          />
        </div>

        {futureDate && (
          <Alert variant="warning">An investment can&apos;t be dated in the future.</Alert>
        )}
        {convert.isError && <Alert variant="danger">{errorMessage(convert.error)}</Alert>}
      </form>
    </Modal>
  )
}

/**
 * What this firm has promised, across every round — the counterpart to Investments.
 *
 * Investments is money that has left the building; this is money that has been pledged and has
 * not. Keeping them on separate pages is deliberate: adding a soft commitment to deployed capital
 * would produce an "assets" figure that is partly conversation.
 *
 * The same band discipline as the founder's view applies here, for the opposite reason. A fund
 * looking at its own book needs to know how much of it is actually binding before it tells an LP
 * what it has allocated.
 */
export const CommitmentsPage = () => {
  useDocumentTitle('Commitments')
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [withdrawing, setWithdrawing] = useState<FundingCommitmentDTO | null>(null)
  const [converting, setConverting] = useState<FundingCommitmentDTO | null>(null)

  const filter = (params.get('status') as Filter) ?? 'ALL'
  const page = Math.max(Number(params.get('page') ?? 0), 0)

  const setParam = (next: Record<string, string | null>) => {
    const updated = new URLSearchParams(params)
    for (const [key, value] of Object.entries(next)) {
      if (value === null) updated.delete(key)
      else updated.set(key, value)
    }
    setParams(updated, { replace: true })
  }

  const queryParams = {
    page,
    size: PAGE_SIZE,
    ...(filter === 'ALL' ? {} : { status: filter }),
  }

  const query = useQuery({
    queryKey: fundingKeys.book(queryParams),
    queryFn: () => fundingApi.listMyCommitments(queryParams),
    // Paging shouldn't blank the table; the old page stays until the new one lands.
    placeholderData: keepPreviousData,
  })

  /**
   * The headline figures, computed by the server over the whole book.
   *
   * Not derived from `items`: those are one page, narrowed by whichever band tab is selected, so
   * totalling them made "Committed" read ₹0 on the Soft tab and made the convert prompt invisible
   * for a round that happened to be on page two.
   */
  const summary = useQuery({
    queryKey: fundingKeys.bookSummary,
    queryFn: fundingApi.bookSummary,
  })
  const totals = summary.data

  const withdraw = useMutation({
    mutationFn: (id: string) => fundingApi.updateCommitment(id, CommitmentStatus.WITHDRAWN),
    // Shown inside the confirm dialog, so it opts out of the global error toast.
    meta: { errorToast: false },
    onSuccess: () => {
      setWithdrawing(null)
      queryClient.invalidateQueries({ queryKey: ['commitments'] })
      // The founder's view of the round changes too.
      queryClient.invalidateQueries({ queryKey: ['funding-cycles'] })
    },
  })

  const items = query.data?.items ?? []
  const cardsRef = useEntrance<HTMLUListElement>(items.length)

  const hasAny = (query.data?.totalElements ?? 0) > 0 || filter !== 'ALL'

  /**
   * Pledges on rounds that have closed and haven't been written into the portfolio yet.
   *
   * The count comes from the summary so it covers the whole book; the rows are the ones on this
   * page, which is what the button can actually act on.
   */
  const readyCount = totals?.readyToRecordCount ?? 0
  const readyHere = items.filter(isConvertible)

  const rowActions = (item: FundingCommitmentDTO) => [
    ...(isConvertible(item)
      ? [
          {
            label: 'Record as investment',
            icon: <BankIcon className="size-4" aria-hidden="true" />,
            onSelect: () => setConverting(item),
          },
        ]
      : []),
    ...(isLive(item) && item.cycleStatus === 'OPEN'
      ? [
          {
            label: 'Withdraw',
            icon: <TrashIcon className="size-4" aria-hidden="true" />,
            destructive: true,
            onSelect: () => setWithdrawing(item),
          },
        ]
      : []),
  ]

  /**
   * The status badge, plus whether the money has actually landed.
   *
   * A converted pledge stays COMMITTED — it is still money the round can count — so "recorded" is
   * a second mark rather than a replacement status. Without it, a firm looking at its book cannot
   * tell which cheques it has already written up.
   */
  const statusCell = (item: FundingCommitmentDTO) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant={commitmentStatusVariants[item.status]}>
        {commitmentStatusLabels[item.status]}
      </Badge>
      {isConverted(item) && (
        <Link
          to="/investments"
          className="link-target inline-block text-xs text-ink-muted hover:text-brand-ink hover:underline"
        >
          In portfolio
        </Link>
      )}
    </div>
  )

  return (
    <>
      <PageHeader
        title="Commitments"
        description="What your firm has pledged across open rounds — money promised, not yet deployed."
        actions={
          <Link to="/deal-flow" className={buttonClass({ variant: 'secondary' })}>
            Browse deal flow
          </Link>
        }
      />

      {hasAny && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Committed"
            value={formatCurrencyTotals(totals?.committedByCurrency ?? {})}
            hint="Signed, and not yet recorded as an investment"
            accent="var(--viz-2)"
          />
          <MetricCard
            label="Likely to fund"
            value={formatCurrencyTotals(totals?.likelyByCurrency ?? {})}
            hint="Committed plus soft. Indications excluded."
            accent="var(--viz-1)"
          />
          <MetricCard
            label="Live pledges"
            count={{ to: totals?.liveCount ?? 0, format: (value) => String(Math.round(value)) }}
            hint="Across every round, still outstanding"
            accent="var(--viz-5)"
          />
        </div>
      )}

      {readyCount > 0 && (
        <Alert variant="info" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              {readyCount === 1 && readyHere.length === 1
                ? `${readyHere[0].startupName}'s round has closed. Record your ${formatMoney(readyHere[0].amount, readyHere[0].currency)} pledge as an investment to move it into your portfolio.`
                : `${pluralize(readyCount, 'round')} you backed ${readyCount === 1 ? 'has' : 'have'} closed. Record those pledges as investments to move them into your portfolio.`}
            </span>
            {/* The prompt now carries the action. Without it the only way to act was to find the
                right row and open its menu, which is a lot to ask of a notice that exists to save
                you looking. */}
            {readyHere.length > 0 ? (
              <Button size="sm" onClick={() => setConverting(readyHere[0])}>
                {readyHere.length === 1 ? 'Record it' : 'Record the first'}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setParam({ status: CommitmentStatus.COMMITTED, page: null })}
              >
                Show them
              </Button>
            )}
          </div>
        </Alert>
      )}

      {hasAny && (
        <Tabs
          className="mb-3"
          label="Commitment status"
          value={filter}
          onChange={(value) => setParam({ status: value === 'ALL' ? null : value, page: null })}
          items={[
            { value: 'ALL', label: 'All' },
            { value: CommitmentStatus.COMMITTED, label: 'Committed' },
            { value: CommitmentStatus.SOFT_COMMITTED, label: 'Soft' },
            { value: CommitmentStatus.INDICATED, label: 'Indicated' },
            { value: CommitmentStatus.WITHDRAWN, label: 'Withdrawn' },
          ]}
        />
      )}

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<CoinsIcon className="size-6" />}
          title={filter === 'ALL' ? 'No commitments yet' : 'Nothing in this band'}
          description={
            filter === 'ALL'
              ? 'When your firm pledges into a round it appears here, so you can see what you have promised before it is drawn down.'
              : 'Try another band, or clear the filter to see every pledge.'
          }
          action={
            <Link to="/deal-flow" className={buttonClass()}>
              Browse deal flow
            </Link>
          }
        />
      ) : (
        <>
          {/* Phone: one card per pledge. The table's six columns can't reflow honestly at 375px. */}
          <TableCardList ref={cardsRef}>
            {items.map((item) => (
              <TableCard key={item.id}>
                <div className="flex items-start gap-3">
                  <EntityAvatar name={item.startupName ?? '—'} />
                  <div className="min-w-0 flex-1">
                    {item.startupId ? (
                      <Link
                        to={`/startups/${item.startupId}`}
                        className="link-target block truncate text-sm font-medium text-ink hover:text-brand-ink hover:underline"
                      >
                        {item.startupName}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-medium text-ink">
                        {item.startupName ?? '—'}
                      </span>
                    )}
                    <Link
                      to={`/rounds/${item.fundingCycleId}`}
                      className="link-target block truncate text-xs text-ink-muted hover:text-brand-ink hover:underline"
                    >
                      {roundLabel(item.roundType)}
                    </Link>
                  </div>
                  {statusCell(item)}
                </div>

                <TableCardField label="Your pledge">
                  <span className="tabular font-medium">
                    {formatMoney(item.amount, item.currency)}
                  </span>
                </TableCardField>
                <TableCardField label="Round target">
                  <span className="tabular">
                    {item.cycleTargetAmount === null
                      ? '—'
                      : formatMoney(item.cycleTargetAmount, item.currency)}
                  </span>
                </TableCardField>
                <TableCardField label="Pledged">{formatDate(item.committedAt)}</TableCardField>

                {rowActions(item).length > 0 && (
                  <div className="mt-3 flex justify-end">
                    <RowActions
                      label={`Actions for ${item.startupName ?? 'this pledge'}`}
                      actions={rowActions(item)}
                    />
                  </div>
                )}
              </TableCard>
            ))}
          </TableCardList>

          <TableSurface className="max-sm:hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead numeric>Your pledge</TableHead>
                  <TableHead numeric>Round target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pledged</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <EntityAvatar name={item.startupName ?? '—'} size="sm" />
                        {item.startupId ? (
                          <Link
                            to={`/startups/${item.startupId}`}
                            className="link-target inline-block font-medium text-ink hover:text-brand-ink hover:underline"
                          >
                            {item.startupName}
                          </Link>
                        ) : (
                          <span className="font-medium text-ink">{item.startupName ?? '—'}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/rounds/${item.fundingCycleId}`}
                        className="link-target inline-block text-ink-secondary hover:text-brand-ink hover:underline"
                      >
                        {roundLabel(item.roundType)}
                      </Link>
                    </TableCell>
                    <TableCell numeric className="font-medium">
                      {formatMoney(item.amount, item.currency)}
                    </TableCell>
                    <TableCell numeric muted>
                      {item.cycleTargetAmount === null
                        ? '—'
                        : formatMoney(item.cycleTargetAmount, item.currency)}
                    </TableCell>
                    <TableCell>{statusCell(item)}</TableCell>
                    <TableCell muted>{formatDate(item.committedAt)}</TableCell>
                    <TableCell>
                      {rowActions(item).length > 0 && (
                        <RowActions
                          label={`Actions for ${item.startupName ?? 'this pledge'}`}
                          actions={rowActions(item)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableSurface>

          <Pagination
            className="mt-4"
            page={query.data?.page ?? 0}
            totalPages={query.data?.totalPages ?? 1}
            totalElements={query.data?.totalElements ?? 0}
            size={query.data?.size ?? PAGE_SIZE}
            onPageChange={(next) => setParam({ page: String(next) })}
            label="commitments"
          />
        </>
      )}

      {converting && (
        <ConvertDialog commitment={converting} onClose={() => setConverting(null)} />
      )}

      <ConfirmDialog
        open={Boolean(withdrawing)}
        title="Withdraw this commitment?"
        description={
          withdrawing
            ? `${formatMoney(withdrawing.amount, withdrawing.currency)} to ${withdrawing.startupName}'s ${roundLabel(withdrawing.roundType)} round.`
            : undefined
        }
        confirmLabel="Withdraw"
        pendingLabel="Withdrawing…"
        isPending={withdraw.isPending}
        error={withdraw.error}
        onConfirm={() => withdrawing && withdraw.mutate(withdrawing.id)}
        onCancel={() => {
          setWithdrawing(null)
          withdraw.reset()
        }}
      >
        <p className="text-sm text-ink-secondary">
          The founder will see that you pulled out, and the amount stops counting toward their
          round. You can pledge again later.
        </p>
      </ConfirmDialog>
    </>
  )
}
