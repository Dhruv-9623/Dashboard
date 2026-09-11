import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { opportunityApi, opportunityKeys } from './api'
import type { CreateOpportunityRequest } from './types'
import { useProfile } from '@/features/profile/useProfile'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Label, FieldHint } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { SparkIcon } from '@/components/icons'
import { errorMessage } from '@/components/ErrorState'
import { CURRENCIES, STAGES, sectorOptions } from '@/lib/constants'

const stageOptions = STAGES.map((stage) => ({ value: stage.value, label: stage.label }))
const currencyOptions = CURRENCIES.map((entry) => ({ value: entry.value, label: entry.label }))

export const NewOpportunityPage = () => {
  const { firm } = useProfile()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    companyName: '',
    website: '',
    sector: '',
    stage: '',
    askAmount: '',
    currency: firm?.thesis?.currency ?? 'INR',
    description: '',
    contactEmail: '',
  })

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateOpportunityRequest = {
        companyName: form.companyName.trim(),
        sector: form.sector,
        stage: form.stage,
        currency: form.currency,
        website: form.website || undefined,
        askAmount: form.askAmount ? Number(form.askAmount) : undefined,
        description: form.description || undefined,
        contactEmail: form.contactEmail || undefined,
      }
      return opportunityApi.create(payload)
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: opportunityKeys.all })
      navigate(`/deal-triage/${deal.id}`, { replace: true })
    },
  })

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const ready = form.companyName.trim() && form.sector && form.stage

  return (
    <>
      <PageHeader
        title="New opportunity"
        description="The scoring agent runs automatically once this is saved."
        actions={
          <Link to="/deal-triage">
            <Button variant="outline">Cancel</Button>
          </Link>
        }
      />

      {firm && !firm.thesis && (
        <Alert variant="warning" className="mb-5" title="No thesis defined">
          This opportunity will be saved but cannot be scored until you set a thesis in Settings.
        </Alert>
      )}

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (ready) mutation.mutate()
            }}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="company-name" required>
                  Company name
                </Label>
                <Input
                  id="company-name"
                  value={form.companyName}
                  onChange={(event) => set('companyName', event.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(event) => set('website', event.target.value)}
                  placeholder="https://"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="sector" required>
                  Sector
                </Label>
                <Select
                  id="sector"
                  options={sectorOptions}
                  value={form.sector}
                  placeholder="Select sector"
                  onChange={(event) => set('sector', event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="stage" required>
                  Stage
                </Label>
                <Select
                  id="stage"
                  options={stageOptions}
                  value={form.stage}
                  placeholder="Select stage"
                  onChange={(event) => set('stage', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  id="currency"
                  options={currencyOptions}
                  value={form.currency}
                  onChange={(event) => set('currency', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="ask">Raise / ask</Label>
                <Input
                  id="ask"
                  type="number"
                  min="0"
                  value={form.askAmount}
                  onChange={(event) => set('askAmount', event.target.value)}
                  placeholder="30000000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">What they do</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => set('description', event.target.value)}
                placeholder="Product, traction, market, and what the round is for."
              />
              <FieldHint>
                The more detail here, the more specific the agent's cited rationale.
              </FieldHint>
            </div>

            <div>
              <Label htmlFor="contact">Contact email</Label>
              <Input
                id="contact"
                type="email"
                value={form.contactEmail}
                onChange={(event) => set('contactEmail', event.target.value)}
              />
            </div>

            {mutation.isError && <Alert variant="danger">{errorMessage(mutation.error)}</Alert>}

            <div className="flex justify-end pt-1">
              <Button type="submit" size="lg" disabled={!ready || mutation.isPending}>
                <SparkIcon className="mr-2 h-4 w-4" />
                {mutation.isPending ? 'Saving & scoring…' : 'Save and score'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
