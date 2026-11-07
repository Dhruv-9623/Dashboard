import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import { UserType } from '@/features/auth/types'
import { useProfile, profileKeys } from '@/features/profile/useProfile'
import { vcFirmApi } from '@/features/vc-firm/api'
import { startupApi, startupKeys } from '@/features/startup/api'
import { StartupRole, startupRoleLabels } from '@/features/startup/types'
import { PlanTier, VCRole, vcRoleLabels } from '@/features/vc-firm/types'
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
import { RowActions } from '@/components/ui/RowActions'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { CheckIcon } from '@/components/icons'
import { actionError, errorMessage } from '@/lib/errorMessage'
import { cn } from '@/lib/utils'
import { STAGES, sectorOptions, formatDate, toCroreInput, fromCroreInput, stageValue } from '@/lib/constants'

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
    aum: toCroreInput(firm?.aum),
  })

  const mutation = useMutation({
    // Reported in place, so it opts out of the global error toast.
    meta: { errorToast: false },
    mutationFn: () =>
      vcFirmApi.updateFirm(firm?.id ?? '', {
        name: form.name.trim(),
        description: form.description || undefined,
        website: form.website || undefined,
        investmentStage: form.investmentStage || undefined,
        sectors: sectors.length > 0 ? sectors : undefined,
        location: form.location || undefined,
        aum: fromCroreInput(form.aum),
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
            {actionError(mutation.error, "Couldn't save the firm profile — try again later.")}
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
    // Reported in place, so it opts out of the global error toast.
    meta: { errorToast: false },
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
            {actionError(mutation.error, "Couldn't save the profile — try again later.")}
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
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>(isStartup ? StartupRole.CO_FOUNDER : VCRole.STAFF)
  const [removing, setRemoving] = useState<TeamMemberRow | null>(null)
  const queryClient = useQueryClient()

  // A firm has a single owner, so OWNER isn't offered when inviting.
  const roleOptions = isStartup
    ? Object.values(StartupRole).map((value) => ({ value, label: startupRoleLabels[value] }))
    : [VCRole.PORTFOLIO_MANAGER, VCRole.STAFF].map((value) => ({ value, label: vcRoleLabels[value] }))

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
    // Reported in place, so it opts out of the global error toast.
    meta: { errorToast: false },
    mutationFn: async () => {
      if (isStartup) {
        await startupApi.addMember(entityId as string, email.trim(), role as StartupRole)
      } else {
        await vcFirmApi.addMember(entityId as string, {
          email: email.trim(),
          role: role as VCRole.PORTFOLIO_MANAGER | VCRole.STAFF,
        })
      }
    },
    onSuccess: () => {
      setEmail('')
      invalidate()
    },
  })

  /**
   * Removing a teammate and changing a VC role.
   *
   * Both endpoints already existed and nothing on the page reached them, so a firm could invite
   * people and never undo it. The startup side has no role-change endpoint, so no role control is
   * offered there rather than one that fails.
   */
  const remove = useMutation({
    meta: { errorToast: false },
    mutationFn: (member: TeamMemberRow) =>
      isStartup
        ? startupApi.removeMember(entityId as string, member.id)
        : vcFirmApi.removeMember(entityId as string, member.id),
    onSuccess: () => {
      setRemoving(null)
      invalidate()
    },
  })

  const changeRole = useMutation({
    meta: { errorToast: false },
    mutationFn: ({ member, newRole }: { member: TeamMemberRow; newRole: VCRole }) =>
      vcFirmApi.changeMemberRole(entityId as string, member.id, newRole),
    onSuccess: invalidate,
  })

  const members = query.data ?? []

  // The single owner can't be demoted or removed, and nobody can remove themselves — both would
  // leave the firm without an administrator.
  const isOwner = (member: TeamMemberRow) => member.role === VCRole.OWNER
  const isSelf = (member: TeamMemberRow) => member.userEmail === user?.email
  const manageable = (member: TeamMemberRow) => !isOwner(member) && !isSelf(member)

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <CardContent className="pt-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Invite a teammate</h2>
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
          <p className="p-6 text-sm text-ink-muted">No teammates yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-16 text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium text-ink">{member.userEmail}</TableCell>
                  <TableCell>
                    {!isStartup && manageable(member) ? (
                      <Select
                        aria-label={`Role for ${member.userEmail}`}
                        className="w-44"
                        options={roleOptions}
                        value={member.role}
                        disabled={changeRole.isPending}
                        onChange={(event) =>
                          changeRole.mutate({ member, newRole: event.target.value as VCRole })
                        }
                      />
                    ) : (
                      <Badge variant="secondary">
                        {vcRoleLabels[member.role as VCRole] ??
                          startupRoleLabels[member.role as StartupRole] ??
                          member.role}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-ink-secondary">
                    {formatDate(member.joinedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {manageable(member) && (
                      <RowActions
                        label={`Actions for ${member.userEmail}`}
                        actions={[
                          {
                            label: 'Remove from team',
                            destructive: true,
                            onSelect: () => setRemoving(member),
                          },
                        ]}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {changeRole.isError && (
        <Alert variant="danger">
          {actionError(changeRole.error, "Couldn't change that role — try again later.")}
        </Alert>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Remove from team?"
        description={
          removing
            ? `${removing.userEmail} loses access immediately. Anything they added stays.`
            : undefined
        }
        confirmLabel="Remove"
        pendingLabel="Removing…"
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => removing && remove.mutate(removing)}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}

const ThesisTab = () => {
  const { firm, isLoading } = useProfile()
  const queryClient = useQueryClient()

  const mutation = useMutation({
    // Reported in place, so it opts out of the global error toast.
    meta: { errorToast: false },
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
            {actionError(mutation.error, "Couldn't save your thesis — try again later.")}
          </Alert>
        )}

        {isLoading ? (
          <SkeletonRows rows={4} />
        ) : (
          <ThesisForm
            /*
             * Keyed on the firm, because every field is seeded by a `useState` initialiser and
             * those run once. Rendered before the profile query resolved, the form kept the empty
             * values it was born with and showed a saved thesis as blank for the rest of the
             * session. The key remounts it when real data arrives.
             */
            key={`${firm?.id ?? 'none'}:${firm?.thesis?.updatedAt ?? 'new'}`}
            thesis={firm?.thesis ?? null}
            firmName={firm?.name ?? ''}
            // Falls back to what the firm profile already declares.
            defaults={{
              sectors: firm?.sectors ?? [],
              stages: firm?.investmentStage ? [stageValue(firm.investmentStage)] : [],
            }}
            submitLabel="Save thesis"
            pending={mutation.isPending}
            onSubmit={(values) => mutation.mutate(values)}
          />
        )}
      </CardContent>
    </Card>
  )
}

const PlanTab = () => {
  const { firm } = useProfile()
  const queryClient = useQueryClient()

  const changePlan = useMutation({
    // Reported in place, so it opts out of the global error toast.
    meta: { errorToast: false },
    mutationFn: (tier: PlanTier) => vcFirmApi.selectPlan(firm?.id ?? '', tier),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.mine }),
  })

  // Nothing stores a plan yet, so there is no current plan to mark and nothing to switch to.
  // Saying so beats three identical "Switch to" buttons that each fail on click.
  const plansAvailable = firm?.planTier !== undefined

  return (
    <>
      {changePlan.isError && (
        <Alert variant="danger" className="mb-5">
          {actionError(changePlan.error, "Couldn't change your plan — try again later.")}
        </Alert>
      )}

      {!plansAvailable && (
        <Alert variant="info" className="mb-5" title="Plans aren't live yet">
          Every firm has full access while billing is being built. We'll show your plan here once
          it's switched on.
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const current = plansAvailable && firm?.planTier === plan.tier

          return (
            <div
              key={plan.tier}
              className={cn(
                'flex flex-col rounded-lg border-2 bg-surface p-5',
                current ? 'border-brand' : 'border-line'
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">{plan.name}</h2>
                {current && <Badge>Current</Badge>}
              </div>

              <div className="mb-1 flex items-baseline gap-1.5">
                <span className="text-2xl font-semibold text-ink">{plan.price}</span>
                <span className="text-sm text-ink-muted">{plan.cadence}</span>
              </div>
              <p className="mb-4 text-sm text-ink-muted">{plan.blurb}</p>

              <ul className="mb-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm text-ink-secondary">
                    <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                variant={current ? 'outline' : 'primary'}
                className="mt-auto w-full"
                disabled={current || !plansAvailable || changePlan.isPending}
                onClick={() => changePlan.mutate(plan.tier)}
                title={!plansAvailable ? 'Available once billing is switched on' : undefined}
              >
                {current ? 'Current plan' : !plansAvailable ? 'Included' : `Switch to ${plan.name}`}
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
