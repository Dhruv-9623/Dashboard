import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select, MultiSelect } from '@/components/ui/Select'
import { Label, FieldHint, FieldError } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { CURRENCIES, STAGES, sectorOptions } from '@/lib/constants'
import type { ThesisDTO, UpdateThesisRequest } from './types'

const stageOptions = STAGES.map((stage) => ({ value: stage.value, label: stage.label }))

export interface ThesisFormValues extends UpdateThesisRequest {
  firmName: string
}

interface ThesisFormProps {
  thesis: ThesisDTO | null
  firmName: string
  showFirmName?: boolean
  submitLabel: string
  pending?: boolean
  onSubmit: (values: ThesisFormValues) => void
  footer?: React.ReactNode
}

export const ThesisForm = ({
  thesis,
  firmName,
  showFirmName = false,
  submitLabel,
  pending,
  onSubmit,
  footer,
}: ThesisFormProps) => {
  const [name, setName] = useState(firmName)
  const [sectors, setSectors] = useState<string[]>(thesis?.sectors ?? [])
  const [stages, setStages] = useState<string[]>(thesis?.stages ?? [])
  const [currency, setCurrency] = useState(thesis?.currency ?? 'INR')
  const [min, setMin] = useState(thesis?.chequeSizeMin?.toString() ?? '')
  const [max, setMax] = useState(thesis?.chequeSizeMax?.toString() ?? '')
  const [notes, setNotes] = useState(thesis?.notes ?? '')
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    if (sectors.length === 0) {
      setError('Pick at least one sector — Deal Triage scores against these.')
      return
    }
    if (stages.length === 0) {
      setError('Pick at least one stage.')
      return
    }

    const chequeMin = min ? Number(min) : null
    const chequeMax = max ? Number(max) : null

    if (chequeMin !== null && chequeMax !== null && chequeMin > chequeMax) {
      setError('Minimum cheque size cannot exceed the maximum.')
      return
    }

    setError('')
    onSubmit({
      firmName: name.trim(),
      sectors,
      stages,
      chequeSizeMin: chequeMin,
      chequeSizeMax: chequeMax,
      currency,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showFirmName && (
        <div>
          <Label htmlFor="firm-name" required>
            Firm name
          </Label>
          <Input
            id="firm-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Meridian Ventures"
            required
          />
        </div>
      )}

      <div>
        <Label required>Sectors you invest in</Label>
        <MultiSelect options={sectorOptions} value={sectors} onChange={setSectors} />
        <FieldHint>The scoring agent matches each opportunity's sector against this list.</FieldHint>
      </div>

      <div>
        <Label required>Stages</Label>
        <MultiSelect options={stageOptions} value={stages} onChange={setStages} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            id="currency"
            options={CURRENCIES.map((entry) => ({ value: entry.value, label: entry.label }))}
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="cheque-min">Min cheque</Label>
          <Input
            id="cheque-min"
            type="number"
            min="0"
            value={min}
            onChange={(event) => setMin(event.target.value)}
            placeholder="2500000"
          />
        </div>
        <div>
          <Label htmlFor="cheque-max">Max cheque</Label>
          <Input
            id="cheque-max"
            type="number"
            min="0"
            value={max}
            onChange={(event) => setMax(event.target.value)}
            placeholder="50000000"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="thesis-notes">Thesis notes</Label>
        <Textarea
          id="thesis-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="What you look for beyond sector and stage — founder profile, business model, geography, anti-patterns."
        />
        <FieldHint>Free text. The scoring agent cites this when explaining a fit score.</FieldHint>
      </div>

      {error && <FieldError>{error}</FieldError>}

      <div className="flex items-center justify-between gap-3 pt-1">
        {footer ?? <span />}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
