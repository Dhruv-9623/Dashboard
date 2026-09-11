import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { useProfile, profileKeys } from '@/features/profile/useProfile'
import { vcFirmApi } from '@/features/vc-firm/api'
import { startupApi, startupKeys } from '@/features/startup/api'
import { StartupRole, startupRoleLabels } from '@/features/startup/types'
import { PlanTier, VCRole } from '@/features/vc-firm/types'
import { ThesisForm } from '@/features/vc-firm/ThesisForm'
import type { ThesisFormValues } from '@/features/vc-firm/ThesisForm'
import { PLANS } from '@/features/vc-firm/plans'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select, MultiSelect } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { Tabs } from '@/components/ui/Tabs'
import { Alert } from '@/components/ui/Alert'
import { Loading } from '@/components/Loading'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { CheckIcon } from '@/components/icons'
import { errorMessage } from '@/components/ErrorState'
import { cn } from '@/lib/utils'
import { STAGES, sectorOptions, formatDate } from '@/lib/constants'

const stageOptions = STAGES.map((stage) => ({ value: stage.label, label: stage.label }))
const startupStageOptions = STAGES.map((stage) => ({ value: stage.value, label: stage.label }))

const FirmProfileTab = () => {
  const { firm, refetch } = useProfile()
  const queryClient = useQueryClient()
  const [sectors, setSectors] = useState<string[]>(firm?.sectors ?? [])
  const [form, setForm] = useState({
    name: firm?.name ?? '',
    description: firm?.description ?? '',
    website: firm?.website ?? '',
    investmentStage: firm?.investmentStage ?? '',
    location: firm?.location ?? '',
    aum: firm?.aum?.toString() ?? '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      vcFirmApi.updateFirm(firm?.id ?? '', {
        name: form.name.trim(),
        description: form.description || undefined,
        website: form.website || undefined,
        investmentStage: form.investmentStage || undefined,
        sectors: sectors.length > 0 ? sectors : undefined,
        location: form.location || undefined,
        aum: form.aum ? Number(form.aum) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.mine })
      refetch()
    },
  })

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <Card className="max-w-3xl">
      <CardContent className="pt-6">
        {mutation.isSuccess && (
          <Alert variant="success" className="mb-5">
            Firm profile updated.
          </Alert>
        )}
        {mutation.isError && (
          <Alert variant="danger" className="mb-5">
            {errorMessage(mutation.error)}
          </Alert>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate()
          }}
          className="space-y-5"
        >
          <div>
            <Label htmlFor="s-firm-name" required>
              Firm name
            </Label>
            <Input
              id="s-firm-name"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="s-firm-desc">About</Label>
            <Textarea
              id="s-firm-desc"
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </div>

          <div>
            <Label>Sectors</Label>
            <MultiSelect options={sectorOptions} value={sectors} onChange={setSectors} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-firm-stage">Primary stage</Label>
              <Select
                id="s-firm-stage"
                options={stageOptions}
                value={form.investmentStage}
                placeholder="Select stage"
                onChange={(event) => set('investmentStage', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s-firm-aum">AUM (₹ crore)</Label>
              <Input
                id="s-firm-aum"
                type="number"
                value={form.aum}
                onChange={(event) => set('aum', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-firm-location">Location</Label>
              <Input
                id="s-firm-location"
                value={form.location}
                onChange={(event) => set('location', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s-firm-website">Website</Label>
              <Input
                id="s-firm-website"
                type="url"
                value={form.website}
                onChange={(event) => set('website', event.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

const StartupProfileTab = () => {
  const { startup, refetch } = useProfile()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: startup?.name ?? '',
    description: startup?.description ?? '',
    website: startup?.website ?? '',
    sector: startup?.sector ?? '',
    stage: startup?.stage ?? '',
    location: startup?.location ?? '',
    annualRevenue: startup?.annualRevenue?.toString() ?? '',
    teamSize: startup?.teamSize?.toString() ?? '',
    pitchDeckUrl: startup?.pitchDeckUrl ?? '',
  })

  const mutation = useMutation({
    mutationFn: () =>
      startupApi.update(startup?.id ?? '', {
        name: form.name.trim(),
        description: form.description || undefined,
        website: form.website || undefined,
        sector: form.sector,
        stage: form.stage,
        location: form.location || undefined,
        annualRevenue: form.annualRevenue ? Number(form.annualRevenue) : undefined,
        teamSize: form.teamSize ? Number(form.teamSize) : undefined,
        pitchDeckUrl: form.pitchDeckUrl || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.mine })
      refetch()
    },
  })

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <Card className="max-w-3xl">
      <CardContent className="pt-6">
        {mutation.isSuccess && (
          <Alert variant="success" className="mb-5">
            Profile updated.
          </Alert>
        )}
        {mutation.isError && (
          <Alert variant="danger" className="mb-5">
            {errorMessage(mutation.error)}
          </Alert>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            mutation.mutate()
          }}
          className="space-y-5"
        >
          <div>
            <Label htmlFor="s-name" required>
              Company name
            </Label>
            <Input
              id="s-name"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="s-desc">What you do</Label>
            <Textarea
              id="s-desc"
              value={form.description}
              onChange={(event) => set('description', event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-sector" required>
                Sector
              </Label>
              <Select
                id="s-sector"
                options={sectorOptions}
                value={form.sector}
                placeholder="Select sector"
                onChange={(event) => set('sector', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s-stage" required>
                Stage
              </Label>
              <Select
                id="s-stage"
                options={startupStageOptions}
                value={form.stage}
                placeholder="Select stage"
                onChange={(event) => set('stage', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="s-location">Location</Label>
              <Input
                id="s-location"
                value={form.location}
                onChange={(event) => set('location', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s-revenue">Annual revenue (₹)</Label>
              <Input
                id="s-revenue"
                type="number"
                value={form.annualRevenue}
                onChange={(event) => set('annualRevenue', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s-team">Team size</Label>
              <Input
                id="s-team"
                type="number"
                value={form.teamSize}
                onChange={(event) => set('teamSize', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s-website">Website</Label>
              <Input
                id="s-website"
                type="url"
                value={form.website}
                onChange={(event) => set('website', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="s-deck">Pitch deck URL</Label>
              <Input
                id="s-deck"
                type="url"
                value={form.pitchDeckUrl}
                onChange={(event) => set('pitchDeckUrl', event.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface TeamMemberRow {
  id: string
  userEmail: string
  role: string
  joinedAt: string
}

const TeamTab = () => {
  const { isStartup, entityId } = useProfile()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>(isStartup ? StartupRole.CO_FOUNDER : VCRole.STAFF)
  const queryClient = useQueryClient()

  const roleOptions = isStartup
    ? Object.values(StartupRole).map((value) => ({ value, label: startupRoleLabels[value] }))
    : Object.values(VCRole).map((value) => ({ value, label: value.replace(/_/g, ' ') }))

  const query = useQuery<TeamMemberRow[]>({
    queryKey: isStartup
      ? startupKeys.members(entityId ?? '')
      : ['vc-firms', entityId ?? '', 'members'],
    queryFn: async () =>
      isStartup
        ? startupApi.getMembers(entityId as string)
        : vcFirmApi.getFirmMembers(entityId as string),
    enabled: Boolean(entityId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['vc-firms'] })
    queryClient.invalidateQueries({ queryKey: ['startups'] })
  }

  const add = useMutation({
    mutationFn: async () => {
      if (isStartup) {
        await startupApi.addMember(entityId as string, email.trim(), role as StartupRole)
      } else {
        await vcFirmApi.addMember(entityId as string, { userId: email.trim() })
      }
    },
    onSuccess: () => {
      setEmail('')
      invalidate()
    },
  })

  const members = query.data ?? []

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Invite a teammate</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (email.trim()) add.mutate()
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[220px] flex-1">
              <Label htmlFor="member-email" required>
                Email
              </Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="teammate@firm.com"
                required
              />
            </div>
            <div className="w-48">
              <Label htmlFor="member-role">Role</Label>
              <Select
                id="member-role"
                options={roleOptions}
                value={role}
                onChange={(event) => setRole(event.target.value)}
              />
            </div>
            <Button type="submit" disabled={!email.trim() || add.isPending}>
              {add.isPending ? 'Inviting…' : 'Invite'}
            </Button>
          </form>

          {add.isError && (
            <Alert variant="danger" className="mt-4">
              {errorMessage(add.error)}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {query.isLoading ? (
          <div className="p-5">
            <SkeletonRows rows={3} />
          </div>
        ) : members.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">No teammates yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-gray-900">{member.userEmail}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{String(member.role).replace(/_/g, ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(member.joinedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

const ThesisTab = () => {
  const { firm } = useProfile()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: ThesisFormValues) =>
      vcFirmApi.updateThesis(firm?.id ?? '', values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.mine }),
  })

  return (
    <Card className="max-w-3xl">
      <CardContent className="pt-6">
        <Alert variant="info" className="mb-5">
          Deal Triage scores every incoming opportunity against this thesis.
        </Alert>

        {mutation.isSuccess && (
          <Alert variant="success" className="mb-5">
            Thesis saved.
          </Alert>
        )}
        {mutation.isError && (
          <Alert variant="danger" className="mb-5">
            {errorMessage(mutation.error)}
          </Alert>
        )}

        <ThesisForm
          thesis={firm?.thesis ?? null}
          firmName={firm?.name ?? ''}
          submitLabel="Save thesis"
          pending={mutation.isPending}
          onSubmit={(values) => mutation.mutate(values)}
        />
      </CardContent>
    </Card>
  )
}

const PlanTab = () => {
  const { firm } = useProfile()
  const queryClient = useQueryClient()

  const changePlan = useMutation({
    mutationFn: (tier: PlanTier) => vcFirmApi.selectPlan(firm?.id ?? '', tier),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.mine }),
  })

  return (
    <>
      {changePlan.isError && (
        <Alert variant="danger" className="mb-5">
          {errorMessage(changePlan.error)}
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = firm?.planTier === plan.tier

          return (
            <div
              key={plan.tier}
              className={cn(
                'flex flex-col rounded-lg border-2 bg-white p-5',
                current ? 'border-blue-600' : 'border-gray-200'
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">{plan.name}</h2>
                {current && <Badge>Current</Badge>}
              </div>

              <div className="mb-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-gray-900">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.cadence}</span>
              </div>
              <p className="mb-4 text-sm text-gray-500">{plan.blurb}</p>

              <ul className="mb-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-gray-700">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={current ? 'outline' : 'primary'}
                className="mt-auto w-full"
                disabled={current || changePlan.isPending}
                onClick={() => changePlan.mutate(plan.tier)}
              >
                {current ? 'Current plan' : `Switch to ${plan.name}`}
              </Button>
            </div>
          )
        })}
      </div>
    </>
  )
}

export const SettingsPage = () => {
  const { user } = useAuth()
  const { isLoading } = useProfile()
  const isStartup = user?.userType === UserType.STARTUP
  const [tab, setTab] = useState('profile')

  if (isLoading) return <Loading />

  const tabs = isStartup
    ? [
        { value: 'profile', label: 'Startup profile' },
        { value: 'team', label: 'Team' },
      ]
    : [
        { value: 'profile', label: 'Firm profile' },
        { value: 'thesis', label: 'Thesis' },
        { value: 'plan', label: 'Plan' },
        { value: 'team', label: 'Team' },
      ]

  return (
    <>
      <PageHeader title="Settings" description="Your profile, team, and preferences." />

      <Tabs className="mb-6" value={tab} onChange={setTab} items={tabs} />

      {tab === 'profile' && (isStartup ? <StartupProfileTab /> : <FirmProfileTab />)}
      {tab === 'thesis' && !isStartup && <ThesisTab />}
      {tab === 'plan' && !isStartup && <PlanTab />}
      {tab === 'team' && <TeamTab />}
    </>
  )
}
