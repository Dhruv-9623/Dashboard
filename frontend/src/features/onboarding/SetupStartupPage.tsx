import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { startupApi } from '@/features/startup/api'
import { profileKeys } from '@/features/profile/useProfile'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Label, FieldError, FieldHint } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { errorMessage } from '@/components/ErrorState'
import { useFieldErrors } from '@/lib/useFieldErrors'
import { STAGES, sectorOptions } from '@/lib/constants'
import { OnboardingLayout } from './OnboardingLayout'

const stageOptions = STAGES.map((stage) => ({ value: stage.value, label: stage.label }))

export const SetupStartupPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    name: '',
    description: '',
    website: '',
    sector: '',
    stage: '',
    location: '',
    foundedYear: '',
    annualRevenue: '',
    teamSize: '',
    pitchDeckUrl: '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      startupApi.create({
        name: form.name.trim(),
        description: form.description || undefined,
        website: form.website || undefined,
        sector: form.sector,
        stage: form.stage,
        location: form.location || undefined,
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : undefined,
        teamSize: form.teamSize ? Number(form.teamSize) : undefined,
        pitchDeckUrl: form.pitchDeckUrl || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.mine })
      navigate('/dashboard', { replace: true })
    },
  })

  const fields = useFieldErrors(mutation.error)

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const ready = form.name.trim() && form.sector && form.stage

  return (
    <OnboardingLayout
      title="Set up your startup"
      description="This is your profile in front of investors — the more complete, the better your matches."
    >
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (ready) mutation.mutate()
            }}
            className="space-y-5"
          >
            <div>
              <Label htmlFor="startup-name" required>
                Company name
              </Label>
              <Input
                id="startup-name"
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                required
                autoFocus
                {...fields.a11y('name', 'startup-name')}
              />
              {fields.message('name') && (
                <FieldError id={fields.errorId('startup-name')}>{fields.message('name')}</FieldError>
              )}
            </div>

            <div>
              <Label htmlFor="startup-description">What you do</Label>
              <Textarea
                id="startup-description"
                value={form.description}
                onChange={(event) => set('description', event.target.value)}
                placeholder="Product, customers, traction, and why now."
              />
              <FieldHint>Investors read this first.</FieldHint>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startup-sector" required>
                  Sector
                </Label>
                <Select
                  id="startup-sector"
                  options={sectorOptions}
                  value={form.sector}
                  placeholder="Select sector"
                  onChange={(event) => set('sector', event.target.value)}
                  required
                  {...fields.a11y('sector', 'startup-sector')}
                />
                {fields.message('sector') && (
                  <FieldError id={fields.errorId('startup-sector')}>{fields.message('sector')}</FieldError>
                )}
              </div>
              <div>
                <Label htmlFor="startup-stage" required>
                  Stage
                </Label>
                <Select
                  id="startup-stage"
                  options={stageOptions}
                  value={form.stage}
                  placeholder="Select stage"
                  onChange={(event) => set('stage', event.target.value)}
                  required
                  {...fields.a11y('stage', 'startup-stage')}
                />
                {fields.message('stage') && (
                  <FieldError id={fields.errorId('startup-stage')}>{fields.message('stage')}</FieldError>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="startup-location">Location</Label>
                <Input
                  id="startup-location"
                  value={form.location}
                  onChange={(event) => set('location', event.target.value)}
                  placeholder="Bengaluru"
                />
              </div>
              <div>
                <Label htmlFor="startup-founded">Founded</Label>
                <Input
                  id="startup-founded"
                  type="number"
                  value={form.foundedYear}
                  onChange={(event) => set('foundedYear', event.target.value)}
                  placeholder="2023"
                  {...fields.a11y('foundedYear', 'startup-founded')}
                />
                {fields.message('foundedYear') && (
                  <FieldError id={fields.errorId('startup-founded')}>{fields.message('foundedYear')}</FieldError>
                )}
              </div>
              <div>
                <Label htmlFor="startup-team">Team size</Label>
                <Input
                  id="startup-team"
                  type="number"
                  min="1"
                  value={form.teamSize}
                  onChange={(event) => set('teamSize', event.target.value)}
                  placeholder="12"
                  {...fields.a11y('teamSize', 'startup-team')}
                />
                {fields.message('teamSize') && (
                  <FieldError id={fields.errorId('startup-team')}>{fields.message('teamSize')}</FieldError>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startup-revenue">Annual revenue (₹)</Label>
                <Input
                  id="startup-revenue"
                  type="number"
                  min="0"
                  value={form.annualRevenue}
                  onChange={(event) => set('annualRevenue', event.target.value)}
                  {...fields.a11y('annualRevenue', 'startup-revenue')}
                />
                {fields.message('annualRevenue') && (
                  <FieldError id={fields.errorId('startup-revenue')}>{fields.message('annualRevenue')}</FieldError>
                )}
              </div>
              <div>
                <Label htmlFor="startup-website">Website</Label>
                <Input
                  id="startup-website"
                  type="url"
                  value={form.website}
                  onChange={(event) => set('website', event.target.value)}
                  placeholder="https://"
                  {...fields.a11y('website', 'startup-website')}
                />
                {fields.message('website') && (
                  <FieldError id={fields.errorId('startup-website')}>{fields.message('website')}</FieldError>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="startup-deck">Pitch deck URL</Label>
              <Input
                id="startup-deck"
                type="url"
                value={form.pitchDeckUrl}
                onChange={(event) => set('pitchDeckUrl', event.target.value)}
                placeholder="https://"
                {...fields.a11y('pitchDeckUrl', 'startup-deck')}
              />
              {fields.message('pitchDeckUrl') && (
                <FieldError id={fields.errorId('startup-deck')}>{fields.message('pitchDeckUrl')}</FieldError>
              )}
            </div>

            {mutation.isError && (
              <Alert variant="danger">{fields.summary((error) => errorMessage(error))}</Alert>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!ready || mutation.isPending}
            >
              {mutation.isPending ? 'Creating…' : 'Create profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </OnboardingLayout>
  )
}
