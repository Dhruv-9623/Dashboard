import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fundingApi, fundingKeys } from './api'
import { CommitmentStatus, commitmentStatusLabels, cycleStatusVariants, cycleStatusLabels } from './types'
import type { FundingCycleDTO } from './types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'
import { Progress } from '@/components/ui/Progress'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { CoinsIcon } from '@/components/icons'
import { CURRENCIES, formatMoney, sectorOptions, stageLabel, STAGES } from '@/lib/constants'

const commitOptions = Object.values(CommitmentStatus).map((status) => ({
  value: status,
  label: commitmentStatusLabels[status],
}))

const CommitModal = ({
  cycle,
  onClose,
}: {
  cycle: FundingCycleDTO
  onClose: () => void
}) => {
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState(cycle.currency)
  const [status, setStatus] = useState(CommitmentStatus.INDICATED)
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      fundingApi.commit(cycle.id, { amount: Number(amount), currency, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funding-cycles'] })
      onClose()
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      title={`Commit to ${cycle.startupName}`}
      description={`${cycle.roundType} · target ${formatMoney(cycle.targetAmount, cycle.currency)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            form="commit-form"
            type="submit"
            disabled={!amount || mutation.isPending}
          >
            {mutation.isPending ? 'Submitting…' : 'Submit commitment'}
          </Button>
        </>
      }
    >
      <form
        id="commit-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (amount) mutation.mutate()
        }}
        className="space-y-4"
      >
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

        {(cycle.minTicketSize || cycle.maxTicketSize) && (
          <p className="text-xs text-gray-500">
            Ticket range: {formatMoney(cycle.minTicketSize, cycle.currency)} –{' '}
            {formatMoney(cycle.maxTicketSize, cycle.currency)}
          </p>
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
  const [committing, setCommitting] = useState<FundingCycleDTO | null>(null)

  const query = useQuery({
    queryKey: fundingKeys.open(sector, stage),
    queryFn: () => fundingApi.listOpen(sector || undefined, stage || undefined),
  })

  const cycles = query.data ?? []

  return (
    <>
      <PageHeader
        title="Deal Flow"
        description="Startups actively raising that match your filters. Commit directly, or open the profile first."
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="w-48">
          <Select
            options={[{ value: '', label: 'All sectors' }, ...sectorOptions]}
            value={sector}
            onChange={(event) => setSector(event.target.value)}
          />
        </div>
        <div className="w-48">
          <Select
            options={[
              { value: '', label: 'All stages' },
              ...STAGES.map((entry) => ({ value: entry.value, label: entry.label })),
            ]}
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          />
        </div>
      </div>

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : cycles.length === 0 ? (
        <EmptyState
          icon={<CoinsIcon className="h-6 w-6" />}
          title="No open rounds"
          description="Nothing matches these filters right now. Try widening the sector or stage."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {cycles.map((cycle) => {
            const progress = cycle.targetAmount
              ? (cycle.committedAmount / cycle.targetAmount) * 100
              : 0

            return (
              <Card key={cycle.id}>
                <CardContent className="py-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/startups/${cycle.startupId}`}
                        className="text-base font-semibold text-gray-900 hover:text-blue-700 hover:underline"
                      >
                        {cycle.startupName}
                      </Link>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {cycle.startupSector} · {stageLabel(cycle.startupStage)}
                      </p>
                    </div>
                    <Badge variant={cycleStatusVariants[cycle.status]}>
                      {cycleStatusLabels[cycle.status]}
                    </Badge>
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
                    <p className="mt-1.5 text-xs text-gray-500">
                      {cycle.roundType} · {cycle.commitmentCount} investor
                      {cycle.commitmentCount === 1 ? '' : 's'} committed
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={() => setCommitting(cycle)}>
                      Commit
                    </Button>
                    {cycle.pitchDeckUrl && (
                      <a href={cycle.pitchDeckUrl} target="_blank" rel="noreferrer noopener">
                        <Button size="sm" variant="outline">
                          Pitch deck
                        </Button>
                      </a>
                    )}
                    <Link to={`/startups/${cycle.startupId}`}>
                      <Button size="sm" variant="ghost">
                        View profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {committing && <CommitModal cycle={committing} onClose={() => setCommitting(null)} />}
    </>
  )
}
