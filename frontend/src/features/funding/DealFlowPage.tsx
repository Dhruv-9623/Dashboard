import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fundingApi, fundingKeys } from './api'
import {
  commitmentStatusLabels,
  cycleStatusLabels,
  cycleStatusVariants,
  CommitmentStatus,
  isLive,
  LADDER_STATUSES,
  ticketProblem,
} from './types'
import type { FundingCommitmentDTO, FundingCycleDTO } from './types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { MeetingScene } from '@/components/illustrations/MeetingScene'
import { Pagination } from '@/components/ui/Pagination'
import { RoundProgress } from './RoundProgress'
import { roundLabel } from '@/features/investments/types'

/** The API sends the enum; people read "Series A", not SERIES_A. */
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button, buttonClass } from '@/components/ui/Button'
import { safeUrl } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { CoinsIcon } from '@/components/icons'
import { CURRENCIES, formatMoney, pluralize, sectorOptions, stageLabel, STAGES } from '@/lib/constants'

/**
 * The bands a firm can pledge into — the ladder only.
 *
 * Built from `LADDER_STATUSES` rather than the whole enum, because WITHDRAWN is not a level of
 * interest and offering it here invited a firm to open a pledge by withdrawing from a round it had
 * never been part of.
 */
const commitOptions = LADDER_STATUSES.map((status) => ({
  value: status,
  label: commitmentStatusLabels[status],
}))

const CommitModal = ({
  cycle,
  existing,
  onClose,
}: {
  cycle: FundingCycleDTO
  /** The firm's current pledge on this round, if it already has one. */
  existing?: FundingCommitmentDTO
  onClose: () => void
}) => {
  /*
   * Prefilled from the firm's current pledge, because POSTing a commitment *replaces* it —
   * the server treats a second pledge from the same firm as that firm changing its number.
   * Opening empty on "Indicated" meant one click could silently demote a signed ₹6 Cr
   * commitment to an indication, with no warning and no undo.
   */
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '')
  const [currency, setCurrency] = useState(existing?.currency ?? cycle.currency)
  const [status, setStatus] = useState(existing?.status ?? CommitmentStatus.INDICATED)
  const queryClient = useQueryClient()

  /** Null when the pledge would be accepted. Checked here so the form answers immediately. */
  const problem = amount
    ? ticketProblem(cycle, Number(amount), currency, formatMoney)
    : null

  const mutation = useMutation({
    // Reported in place, so it opts out of the global error toast.
    meta: { errorToast: false },
    mutationFn: () =>
      fundingApi.commit(cycle.id, { amount: Number(amount), currency, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-cycles'] })
      // The pledge just made is a row on the firm's own book, and its totals change. Without
      // this, committing from Deal Flow moved the round's progress bar and left Commitments
      // showing the firm's previous position.
      queryClient.invalidateQueries({ queryKey: ['commitments'] })
      onClose()
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={existing ? `Update your pledge to ${cycle.startupName}` : `Commit to ${cycle.startupName}`}
      description={`${roundLabel(cycle.roundType)} · target ${formatMoney(cycle.targetAmount, cycle.currency)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            form="commit-form"
            type="submit"
            disabled={!amount || Boolean(problem) || mutation.isPending}
          >
            {mutation.isPending
              ? 'Submitting…'
              : existing
                ? 'Update pledge'
                : 'Submit commitment'}
          </Button>
        </>
      }
    >
      <form
        id="commit-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (amount && !problem) mutation.mutate()
        }}
        className="space-y-4"
      >
        {existing && (
          <Alert variant="info">
            Your firm has already pledged{' '}
            <strong>{formatMoney(existing.amount, existing.currency)}</strong> to this round, marked{' '}
            <strong>{commitmentStatusLabels[existing.status].toLowerCase()}</strong>. Saving replaces
            that pledge rather than adding a second one.
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <div>
            <Label htmlFor="commit-currency">Currency</Label>
            <Select
              id="commit-currency"
              options={CURRENCIES.map((entry) => ({ value: entry.value, label: entry.label }))}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="commit-amount" required>
              Amount
            </Label>
            <Input
              id="commit-amount"
              type="number"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              autoFocus
            />
          </div>
        </div>

        {problem ? (
          <p role="alert" className="text-xs text-negative">
            {problem}
          </p>
        ) : (
          (cycle.minTicketSize || cycle.maxTicketSize) && (
            <p className="text-xs text-ink-muted">
              Ticket range: {formatMoney(cycle.minTicketSize, cycle.currency)} –{' '}
              {formatMoney(cycle.maxTicketSize, cycle.currency)}
            </p>
          )
        )}

        <div>
          <Label htmlFor="commit-status">Commitment level</Label>
          <Select
            id="commit-status"
            options={commitOptions}
            value={status}
            onChange={(event) => setStatus(event.target.value as CommitmentStatus)}
          />
        </div>

        {mutation.isError && <Alert variant="danger">{errorMessage(mutation.error)}</Alert>}
      </form>
    </Modal>
  )
}

export const DealFlowPage = () => {
  const [sector, setSector] = useState('')
  const [stage, setStage] = useState('')
  const [page, setPage] = useState(0)
  const [committing, setCommitting] = useState<FundingCycleDTO | null>(null)

  const params = {
    sector: sector || undefined,
    stage: stage || undefined,
    page,
    size: 20,
  }
  const query = useQuery({
    queryKey: fundingKeys.open(params),
    queryFn: () => fundingApi.listOpen(params),
    // Hold the previous page while the next one loads, rather than flashing a skeleton.
    placeholderData: keepPreviousData,
  })

  /**
   * The firm's own pledges, so a round it has already backed says so before anything is clicked.
   *
   * Fetched as one page of the whole book rather than per round: deal flow shows at most 20 rounds
   * and the book is small, so this is one request instead of twenty.
   */
  const bookParams = { size: 100 }
  const book = useQuery({
    queryKey: fundingKeys.book(bookParams),
    queryFn: () => fundingApi.listMyCommitments(bookParams),
  })

  const pledgeByCycle = new Map(
    (book.data?.items ?? []).filter(isLive).map((pledge) => [pledge.fundingCycleId, pledge])
  )

  const cycles = query.data?.items ?? []

  // Changing a filter has to reset the page, or page 3 of "all sectors" becomes an empty page 3
  // of "Fintech".
  const changeFilter = (apply: () => void) => {
    apply()
    setPage(0)
  }

  return (
    <>
      <PageHeader
        title="Deal Flow"
        description="Startups actively raising that match your filters. Commit directly, or open the profile first."
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            aria-label="Filter by sector"
            options={[{ value: '', label: 'All sectors' }, ...sectorOptions]}
            value={sector}
            onChange={(event) => changeFilter(() => setSector(event.target.value))}
          />
        </div>
        <div className="w-48">
          <Select
            aria-label="Filter by stage"
            options={[
              { value: '', label: 'All stages' },
              ...STAGES.map((entry) => ({ value: entry.value, label: entry.label })),
            ]}
            value={stage}
            onChange={(event) => changeFilter(() => setStage(event.target.value))}
          />
        </div>
      </div>

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : cycles.length === 0 ? (
        <EmptyState
          icon={<CoinsIcon className="size-6" />}
          title="No open rounds"
          description="Nothing matches these filters right now. Widen the sector or stage, and founders raising in your thesis will show up here."
          scene={<MeetingScene />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cycles.map((cycle) => {
            return (
              <Card key={cycle.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/startups/${cycle.startupId}`}
                        className="link-target inline-block text-base font-semibold text-ink hover:text-brand-ink hover:underline"
                      >
                        {cycle.startupName}
                      </Link>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {cycle.startupSector} · {stageLabel(cycle.startupStage)}
                      </p>
                    </div>
                    <Badge variant={cycleStatusVariants[cycle.status]}>
                      {cycleStatusLabels[cycle.status]}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <RoundProgress cycle={cycle} compact />
                    <p className="mt-1.5 text-xs text-ink-muted">
                      <Link
                        to={`/rounds/${cycle.id}`}
                        className="link-target inline-block hover:text-brand-ink hover:underline"
                      >
                        {roundLabel(cycle.roundType)}
                      </Link>{' '}
                      {/* "investors" not "investors committed": the count covers every band,
                          so a round with only indications was claiming commitments it had none
                          of — next to a ₹0 committed figure, which made it plainly wrong. */}
                      · {pluralize(cycle.commitmentCount, 'investor')}
                    </p>
                  </div>

                  {pledgeByCycle.has(cycle.id) && (
                    <p className="mt-3 text-xs text-ink-secondary">
                      Your pledge:{' '}
                      <span className="font-semibold text-ink">
                        {formatMoney(
                          pledgeByCycle.get(cycle.id)!.amount,
                          pledgeByCycle.get(cycle.id)!.currency
                        )}
                      </span>{' '}
                      · {commitmentStatusLabels[pledgeByCycle.get(cycle.id)!.status]}
                    </p>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={() => setCommitting(cycle)}>
                      {pledgeByCycle.has(cycle.id) ? 'Update pledge' : 'Commit'}
                    </Button>
                    {safeUrl(cycle.pitchDeckUrl) && (
                      <a
                        href={safeUrl(cycle.pitchDeckUrl)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={buttonClass({ size: 'sm', variant: 'outline' })}
                      >
                        Pitch deck
                      </a>
                    )}
                    <Link
                      to={`/startups/${cycle.startupId}`}
                      className={buttonClass({ size: 'sm', variant: 'ghost' })}
                    >
                      View profile
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {query.data && (
        <Pagination
          page={query.data.page}
          totalPages={query.data.totalPages}
          totalElements={query.data.totalElements}
          size={query.data.size}
          onPageChange={setPage}
          label="open rounds"
        />
      )}

      {committing && (
        <CommitModal
          cycle={committing}
          existing={pledgeByCycle.get(committing.id)}
          onClose={() => setCommitting(null)}
        />
      )}
    </>
  )
}
