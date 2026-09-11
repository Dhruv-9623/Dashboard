import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { vcFirmApi } from '@/features/vc-firm/api'
import { profileKeys } from '@/features/profile/useProfile'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { MultiSelect, Select } from '@/components/ui/Select'
import { Label, FieldHint } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { errorMessage } from '@/components/ErrorState'
import { STAGES, sectorOptions } from '@/lib/constants'
import { OnboardingLayout } from './OnboardingLayout'

const stageOptions = STAGES.map((stage) => ({ value: stage.label, label: stage.label }))

export const SetupFirmPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [sectors, setSectors] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    website: '',
    aum: '',
    investmentStage: '',
    location: '',
    foundedYear: '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      vcFirmApi.createFirm({
        name: form.name.trim(),
        description: form.description || undefined,
        website: form.website || undefined,
        aum: form.aum ? Number(form.aum) : undefined,
        investmentStage: form.investmentStage || undefined,
        sectors: sectors.length > 0 ? sectors : undefined,
        location: form.location || undefined,
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.mine })
      navigate('/dashboard', { replace: true })
    },
  })

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <OnboardingLayout
      title="Set up your firm"
      description="This is what founders see when they find you, and what powers your matches."
    >
      <Card>
        <CardContent className="pt-6">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (form.name.trim()) mutation.mutate()
            }}
            className="space-y-5"
          >
            <div>
              <Label htmlFor="firm-name" required>
                Firm name
              </Label>
              <Input
                id="firm-name"
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                placeholder="e.g. Meridian Ventures"
                required
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="firm-description">About the firm</Label>
              <Textarea
                id="firm-description"
                value={form.description}
                onChange={(event) => set('description', event.target.value)}
                placeholder="What you back, cheque sizes, and how you work with founders."
              />
            </div>

            <div>
              <Label>Sectors you invest in</Label>
              <MultiSelect options={sectorOptions} value={sectors} onChange={setSectors} />
              <FieldHint>Used for matching and to filter your Deal Flow.</FieldHint>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firm-stage">Primary stage</Label>
                <Select
                  id="firm-stage"
                  options={stageOptions}
                  value={form.investmentStage}
                  placeholder="Select stage"
                  onChange={(event) => set('investmentStage', event.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="firm-aum">AUM (₹ crore)</Label>
                <Input
                  id="firm-aum"
                  type="number"
                  min="0"
                  value={form.aum}
                  onChange={(event) => set('aum', event.target.value)}
                  placeholder="500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="firm-location">Location</Label>
                <Input
                  id="firm-location"
                  value={form.location}
                  onChange={(event) => set('location', event.target.value)}
                  placeholder="Bengaluru, India"
                />
              </div>
              <div>
                <Label htmlFor="firm-founded">Founded</Label>
                <Input
                  id="firm-founded"
                  type="number"
                  value={form.foundedYear}
                  onChange={(event) => set('foundedYear', event.target.value)}
                  placeholder="2018"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="firm-website">Website</Label>
              <Input
                id="firm-website"
                type="url"
                value={form.website}
                onChange={(event) => set('website', event.target.value)}
                placeholder="https://"
              />
            </div>

            {mutation.isError && <Alert variant="danger">{errorMessage(mutation.error)}</Alert>}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!form.name.trim() || mutation.isPending}
            >
              {mutation.isPending ? 'Creating…' : 'Create firm'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </OnboardingLayout>
  )
}
