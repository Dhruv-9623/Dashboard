import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fundingApi, fundingKeys } from './api'
import {
  CommitmentStatus,
  FundingCycleStatus,
  commitmentStatusLabels,
  commitmentStatusVariants,
  cycleStatusLabels,
  cycleStatusVariants,
  ticketBandProblem,
} from './types'
import type { FundingCycleDTO } from './types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { MetricCard } from '@/components/MetricCard'
import { InvestmentRound, roundLabel, roundLabels } from '@/features/investments/types'
import { RoundProgress } from './RoundProgress'
import { likelyAmount } from './types'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button, buttonClass } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { CoinsIcon, PlusIcon } from '@/components/icons'
import { CURRENCIES, formatDate, formatMoney } from '@/lib/constants'

const statusOptions = Object.values(FundingCycleStatus).map((status) => ({
  value: status,
  label: cycleStatusLabels[status],
}))

/**
 * Rounds, not startup stages — and the value is the enum the API stores.
 *
 * This previously sent the display label ("Series A") as the value, built from the STAGES list.
 * It worked only because the mock accepted any string; the real endpoint rejects it.
 */
const roundOptions = Object.values(InvestmentRound).map((round) => ({
  value: round,
  label: roundLabels[round],
}))

const CycleModal = ({
  cycle,
  openRoundElsewhere,
  onClose,
}: {
  cycle: FundingCycleDTO | null
  /** Another round of this startup's is already OPEN, so this one can't be. */
  openRoundElsewhere: boolean
  onClose: () => void
}) => {
  const [form, setForm] = useState({
    roundType: cycle?.roundType ?? 'SEED',
    targetAmount: cycle?.targetAmount?.toString() ?? '',
    currency: cycle?.currency ?? 'INR',
    minTicketSize: cycle?.minTicketSize?.toString() ?? '',
    maxTicketSize: cycle?.maxTicketSize?.toString() ?? '',
    status: cycle?.status ?? FundingCycleStatus.OPEN,
    pitchDeckUrl: cycle?.pitchDeckUrl ?? '',
    dataRoomUrl: cycle?.dataRoomUrl ?? '',
  })

  const queryClient = useQueryClient()

  const mutation = useMutation({
    // Reported in place, so it opts out of the global error toast.
    meta: { errorToast: false },
    mutationFn: () => {
      const payload = {
        roundType: form.roundType,
        targetAmount: Number(form.targetAmount),
        currency: form.currency,
        minTicketSize: form.minTicketSize ? Number(form.minTicketSize) : undefined,
        maxTicketSize: form.maxTicketSize ? Number(form.maxTicketSize) : undefined,
        status: form.status,
        pitchDeckUrl: form.pitchDeckUrl || undefined,
        dataRoomUrl: form.dataRoomUrl || undefined,
      }
      return cycle ? fundingApi.update(cycle.id, payload) : fundingApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fundingKeys.mine })
      onClose()
    },
  })

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  /**
   * Why this round would be refused, or null.
   *
   * Both rules are enforced by the server and one of them by a CHECK constraint as well, but
   * neither reached the founder until they pressed Save — so a ₹9 Cr minimum with a ₹4 Cr maximum
   * looked accepted, and "Open a round" looked available while a round was already open.
   */
  const problem =
    ticketBandProblem(
      form.minTicketSize ? Number(form.minTicketSize) : null,
      form.maxTicketSize ? Number(form.maxTicketSize) : null,
    ) ??
    (form.status === FundingCycleStatus.OPEN && openRoundElsewhere
      ? 'Another round is already open. Close or pause it first.'
      : null)

  return (
    <Modal
      open
      onClose={onClose}
      title={cycle ? 'Edit round' : 'Open a round'}
      description="Investors browsing Deal Flow will see this while it's open."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            form="cycle-form"
            type="submit"
            disabled={!form.targetAmount || Boolean(problem) || mutation.isPending}
          >
            {mutation.isPending ? 'Saving…' : cycle ? 'Save changes' : 'Open round'}
          </Button>
        </>
      }
    >
      <form
        id="cycle-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (form.targetAmount && !problem) mutation.mutate()
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cycle-round">Round</Label>
            <Select
              id="cycle-round"
              options={roundOptions}
              value={form.roundType}
              onChange={(event) => set('roundType', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cycle-status">Status</Label>
            <Select
              id="cycle-status"
              options={statusOptions}
              value={form.status}
              onChange={(event) => set('status', event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <div>
            <Label htmlFor="cycle-currency">Currency</Label>
            <Select
              id="cycle-currency"
              options={CURRENCIES.map((entry) => ({ value: entry.value, label: entry.label }))}
              value={form.currency}
              onChange={(event) => set('currency', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cycle-target" required>
              Target amount
            </Label>
            <Input
              id="cycle-target"
              type="number"
              min="0"
              value={form.targetAmount}
              onChange={(event) => set('targetAmount', event.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cycle-min">Min ticket</Label>
            <Input
              id="cycle-min"
              type="number"
              min="0"
              value={form.minTicketSize}
              onChange={(event) => set('minTicketSize', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cycle-max">Max ticket</Label>
            <Input
              id="cycle-max"
              type="number"
              min="0"
              value={form.maxTicketSize}
              onChange={(event) => set('maxTicketSize', event.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="cycle-deck">Pitch deck URL</Label>
          <Input
            id="cycle-deck"
            type="url"
            value={form.pitchDeckUrl}
            onChange={(event) => set('pitchDeckUrl', event.target.value)}
            placeholder="https://"
          />
        </div>

        <div>
          <Label htmlFor="cycle-dataroom">Data room URL</Label>
          <Input
            id="cycle-dataroom"
            type="url"
            value={form.dataRoomUrl}
            onChange={(event) => set('dataRoomUrl', event.target.value)}
            placeholder="https://"
          />
        </div>

        {problem && <Alert variant="warning">{problem}</Alert>}
        {mutation.isError && <Alert variant="danger">{errorMessage(mutation.error)}</Alert>}
      </form>
    </Modal>
  )
}

const Commitments = ({ cycleId }: { cycleId: string }) => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: fundingKeys.commitments(cycleId),
    queryFn: () => fundingApi.listCommitments(cycleId),
  })

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommitmentStatus }) =>
      fundingApi.updateCommitment(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fundingKeys.commitments(cycleId) })
      // The bands and the investor count live on the round, not on the commitment, so promoting
      // a pledge has to refetch the round as well. Without this the cards and the progress bar
      // kept the old figures until something else happened to invalidate them — saving the Edit
      // dialog, which is why it looked like only Edit worked.
      queryClient.invalidateQueries({ queryKey: fundingKeys.mine })
      queryClient.invalidateQueries({ queryKey: fundingKeys.history(cycleId) })
    },
  })

  const commitments = query.data ?? []

  if (query.isLoading) return <SkeletonRows rows={2} />
  if (commitments.length === 0) {
    return <p className="px-4 py-6 text-sm text-ink-muted">No commitments on this round yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <tr>
          <TableHead>Investor</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Move to</TableHead>
        </tr>
      </TableHeader>
      <TableBody>
        {commitments.map((commitment) => (
          <TableRow key={commitment.id}>
            <TableCell className="font-medium text-ink">{commitment.vcFirmName}</TableCell>
            <TableCell className="tabular-nums text-ink">
              {formatMoney(commitment.amount, commitment.currency)}
            </TableCell>
            <TableCell>
              <Badge variant={commitmentStatusVariants[commitment.status]}>
                {commitmentStatusLabels[commitment.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-ink-secondary">
              {formatDate(commitment.committedAt)}
            </TableCell>
            <TableCell className="text-right">
              {commitment.status !== CommitmentStatus.COMMITTED && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    update.mutate({
                      id: commitment.id,
                      status:
                        commitment.status === CommitmentStatus.INDICATED
                          ? CommitmentStatus.SOFT_COMMITTED
                          : CommitmentStatus.COMMITTED,
                    })
                  }
                  disabled={update.isPending}
                >
                  {commitment.status === CommitmentStatus.INDICATED ? 'Soft commit' : 'Confirm'}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export const FundingPage = () => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FundingCycleDTO | null>(null)

  const query = useQuery({ queryKey: fundingKeys.mine, queryFn: fundingApi.listMine })

  const cycles = query.data ?? []
  const open = cycles.find((cycle) => cycle.status === FundingCycleStatus.OPEN)
  const currency = cycles[0]?.currency ?? 'INR'
  // Signed money and the forecast are different numbers, and the difference is the point.
  const totalCommitted = cycles.reduce((total, cycle) => total + cycle.committedAmount, 0)
  const openLikely = open ? likelyAmount(open) : 0

  return (
    <>
      <PageHeader
        title="Funding Rounds"
        description="Rounds you're raising, and the commitments investors have made."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Open a round
          </Button>
        }
      />

      {cycles.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Committed"
            value={formatMoney(totalCommitted, currency)}
            hint="Signed across every round"
            accent="var(--viz-2)"
            emphasis
          />
          <MetricCard
            label="Open round"
            value={roundLabel(open?.roundType)}
            hint={open ? `${formatMoney(open.targetAmount, open.currency)} target` : 'None open'}
            accent="var(--viz-1)"
          />
          <MetricCard
            label="Likely to land"
            value={open ? formatMoney(openLikely, open.currency) : '—'}
            hint="Committed plus soft, excluding indications"
            accent="var(--viz-3)"
          />
          <MetricCard
            label="Investors"
            count={{ to: open?.commitmentCount ?? 0, format: (value) => String(Math.round(value)) }}
            hint="On the open round"
            accent="var(--viz-5)"
          />
        </div>
      )}

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : cycles.length === 0 ? (
        <EmptyState
          icon={<CoinsIcon className="h-6 w-6" />}
          title="No rounds yet"
          description="Open a round to appear in investors' Deal Flow."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setModalOpen(true)
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Open a round
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {cycles.map((cycle) => {
            return (
              <Card key={cycle.id}>
                <CardContent className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-ink">
                          <Link
                            to={`/rounds/${cycle.id}`}
                            className="link-target inline-block hover:text-brand-ink hover:underline"
                          >
                            {roundLabel(cycle.roundType)}
                          </Link>
                        </h2>
                        <Badge variant={cycleStatusVariants[cycle.status]}>
                          {cycleStatusLabels[cycle.status]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        Opened {formatDate(cycle.openedAt)}
                        {cycle.closedAt ? ` · closed ${formatDate(cycle.closedAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/rounds/${cycle.id}`}
                        className={buttonClass({ variant: 'secondary', size: 'sm' })}
                      >
                        History
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(cycle)
                          setModalOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>

                  <RoundProgress cycle={cycle} className="mt-4" percent />

                  {/* Not behind a toggle any more. Who has pledged, and how firmly, is the whole
                      reason a founder opens this page — hiding it behind "Show 3 commitments"
                      made the answer cost a click and gave the count no context. */}
                  <div className="mt-4 overflow-hidden rounded border border-line">
                    <Commitments cycleId={cycle.id} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <CycleModal
          cycle={editing}
          // Editing the open round itself isn't "another round being open".
          openRoundElsewhere={open !== undefined && open.id !== editing?.id}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
