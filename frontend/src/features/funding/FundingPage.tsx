import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fundingApi, fundingKeys } from './api'
import {
  CommitmentStatus,
  FundingCycleStatus,
  commitmentStatusLabels,
  commitmentStatusVariants,
  cycleStatusLabels,
  cycleStatusVariants,
} from './types'
import type { FundingCycleDTO } from './types'
import { PageHeader } from '@/components/PageHeader'
import { StatTile } from '@/components/StatTile'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { CoinsIcon, PlusIcon } from '@/components/icons'
import { CURRENCIES, STAGES, formatDate, formatMoney } from '@/lib/constants'

const statusOptions = Object.values(FundingCycleStatus).map((status) => ({
  value: status,
  label: cycleStatusLabels[status],
}))

const roundOptions = STAGES.map((stage) => ({ value: stage.label, label: stage.label }))

const CycleModal = ({
  cycle,
  onClose,
}: {
  cycle: FundingCycleDTO | null
  onClose: () => void
}) => {
  const [form, setForm] = useState({
    roundType: cycle?.roundType ?? 'Seed',
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
            disabled={!form.targetAmount || mutation.isPending}
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
          if (form.targetAmount) mutation.mutate()
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: fundingKeys.commitments(cycleId) }),
  })

  const commitments = query.data ?? []

  if (query.isLoading) return <SkeletonRows rows={2} />
  if (commitments.length === 0) {
    return <p className="px-4 py-6 text-sm text-gray-500">No commitments on this round yet.</p>
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
            <TableCell className="font-medium text-gray-900">{commitment.vcFirmName}</TableCell>
            <TableCell className="tabular-nums text-gray-900">
              {formatMoney(commitment.amount, commitment.currency)}
            </TableCell>
            <TableCell>
              <Badge variant={commitmentStatusVariants[commitment.status]}>
                {commitmentStatusLabels[commitment.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-gray-600">
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
  const [expanded, setExpanded] = useState<string | null>(null)

  const query = useQuery({ queryKey: fundingKeys.mine, queryFn: fundingApi.listMine })

  const cycles = query.data ?? []
  const open = cycles.find((cycle) => cycle.status === FundingCycleStatus.OPEN)
  const totalRaised = cycles.reduce((total, cycle) => total + cycle.committedAmount, 0)

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
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <StatTile
            label="Total committed"
            value={formatMoney(totalRaised, cycles[0]?.currency ?? 'INR')}
          />
          <StatTile
            label="Current round"
            value={open ? open.roundType : '—'}
            hint={open ? formatMoney(open.targetAmount, open.currency) + ' target' : undefined}
          />
          <StatTile label="Rounds run" value={cycles.length} />
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
            const progress = cycle.targetAmount
              ? (cycle.committedAmount / cycle.targetAmount) * 100
              : 0

            return (
              <Card key={cycle.id}>
                <CardContent className="py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-gray-900">{cycle.roundType}</h2>
                        <Badge variant={cycleStatusVariants[cycle.status]}>
                          {cycleStatusLabels[cycle.status]}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-gray-500">
                        Opened {formatDate(cycle.openedAt)}
                        {cycle.closedAt ? ` · closed ${formatDate(cycle.closedAt)}` : ''}
                      </p>
                    </div>
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

                  <div className="mt-4">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-gray-900">
                        {formatMoney(cycle.committedAmount, cycle.currency)}
                      </span>
                      <span className="text-gray-500">
                        of {formatMoney(cycle.targetAmount, cycle.currency)}
                      </span>
                    </div>
                    <Progress className="mt-2" value={progress} tone="green" />
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 -ml-3"
                    onClick={() => setExpanded(expanded === cycle.id ? null : cycle.id)}
                  >
                    {expanded === cycle.id ? 'Hide' : 'Show'} {cycle.commitmentCount} commitment
                    {cycle.commitmentCount === 1 ? '' : 's'}
                  </Button>

                  {expanded === cycle.id && (
                    <div className="mt-3 overflow-hidden rounded border border-gray-200">
                      <Commitments cycleId={cycle.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <CycleModal
          cycle={editing}
          onClose={() => {
            setModalOpen(false)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
