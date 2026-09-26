import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { investmentApi, investmentKeys } from './api'
import { InvestmentRound, InvestmentStatus, investmentStatusLabels, roundLabels } from './types'
import type { InvestmentDTO, UpsertInvestmentRequest } from './types'
import type { StartupDTO } from '@/features/startup/types'
import { StartupPicker } from '@/components/StartupPicker'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Label, FieldError } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/Toast'
import { useFieldErrors } from '@/lib/useFieldErrors'
import { CURRENCIES } from '@/lib/constants'
import { errorMessage } from '@/components/ErrorState'

const roundOptions = Object.values(InvestmentRound).map((round) => ({
  value: round,
  label: roundLabels[round],
}))

const statusOptions = Object.values(InvestmentStatus).map((status) => ({
  value: status,
  label: investmentStatusLabels[status],
}))

interface InvestmentFormProps {
  open: boolean
  onClose: () => void
  investment: InvestmentDTO | null
}

export const InvestmentForm = ({ open, onClose, investment }: InvestmentFormProps) => {
  const [startup, setStartup] = useState<StartupDTO | null>(
    investment
      ? ({
          id: investment.startupId,
          name: investment.startupName,
          sector: investment.startupSector,
          logoUrl: investment.startupLogoUrl,
          stage: '',
        } as StartupDTO)
      : null
  )

  const [form, setForm] = useState({
    investmentDate: investment?.investmentDate?.slice(0, 10) ?? '',
    amount: investment?.amount?.toString() ?? '',
    currency: investment?.currency ?? 'INR',
    round: investment?.round ?? InvestmentRound.SEED,
    equityPercentage: investment?.equityPercentage?.toString() ?? '',
    status: investment?.status ?? InvestmentStatus.ACTIVE,
    notes: investment?.notes ?? '',
  })

  const queryClient = useQueryClient()
  const toast = useToast()

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UpsertInvestmentRequest = {
        startupId: startup?.id ?? '',
        investmentDate: form.investmentDate,
        amount: Number(form.amount),
        currency: form.currency,
        round: form.round,
        equityPercentage: form.equityPercentage ? Number(form.equityPercentage) : undefined,
        status: form.status,
        notes: form.notes || undefined,
      }
      return investment
        ? investmentApi.update(investment.id, payload)
        : investmentApi.create(payload)
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: investmentKeys.all })
      toast.success(investment ? `Updated the ${saved.startupName} position` : `Recorded ${saved.startupName}`)
      onClose()
    },
  })

  const fields = useFieldErrors(mutation.error)

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const ready = Boolean(startup && form.investmentDate && form.amount)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={investment ? 'Edit investment' : 'Record investment'}
      description="Positions you hold. Conflict Sentinel and Portfolio Pulse both read from this."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button form="investment-form" type="submit" disabled={!ready || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : investment ? 'Save changes' : 'Add investment'}
          </Button>
        </>
      }
    >
      <form
        id="investment-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) mutation.mutate()
        }}
        className="space-y-4"
      >
        <div>
          <Label required>Startup</Label>
          <StartupPicker value={startup} onChange={setStartup} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="inv-date" required>
              Investment date
            </Label>
            <Input
              id="inv-date"
              type="date"
              value={form.investmentDate}
              onChange={(event) => set('investmentDate', event.target.value)}
              required
              {...fields.a11y('investmentDate', 'inv-date')}
            />
            {fields.message('investmentDate') && (
              <FieldError id={fields.errorId('inv-date')}>{fields.message('investmentDate')}</FieldError>
            )}
          </div>
          <div>
            <Label htmlFor="inv-round">Round</Label>
            <Select
              id="inv-round"
              options={roundOptions}
              value={form.round}
              onChange={(event) => set('round', event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="inv-currency">Currency</Label>
            <Select
              id="inv-currency"
              options={CURRENCIES.map((entry) => ({ value: entry.value, label: entry.label }))}
              value={form.currency}
              onChange={(event) => set('currency', event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="inv-amount" required>
              Amount
            </Label>
            <Input
              id="inv-amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={(event) => set('amount', event.target.value)}
              required
              {...fields.a11y('amount', 'inv-amount')}
            />
            {fields.message('amount') && (
              <FieldError id={fields.errorId('inv-amount')}>{fields.message('amount')}</FieldError>
            )}
          </div>
          <div>
            <Label htmlFor="inv-equity">Equity %</Label>
            <Input
              id="inv-equity"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.equityPercentage}
              onChange={(event) => set('equityPercentage', event.target.value)}
              {...fields.a11y('equityPercentage', 'inv-equity')}
            />
            {fields.message('equityPercentage') && (
              <FieldError id={fields.errorId('inv-equity')}>{fields.message('equityPercentage')}</FieldError>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="inv-status">Status</Label>
          <Select
            id="inv-status"
            options={statusOptions}
            value={form.status}
            onChange={(event) => set('status', event.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="inv-notes">Notes</Label>
          <Textarea
            id="inv-notes"
            rows={3}
            value={form.notes}
            onChange={(event) => set('notes', event.target.value)}
            placeholder="Deal terms, board seat, latest metrics — Portfolio Pulse summarises this."
            {...fields.a11y('notes', 'inv-notes')}
          />
          {fields.message('notes') && (
            <FieldError id={fields.errorId('inv-notes')}>{fields.message('notes')}</FieldError>
          )}
        </div>

        {mutation.isError && (
          <Alert variant="danger">{fields.summary((error) => errorMessage(error))}</Alert>
        )}
      </form>
    </Modal>
  )
}
