import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { poolApi, poolKeys } from './api'
import { InterestLevel, interestLevelLabels, interestLevelVariants } from './types'
import type { PoolEntryDTO, UpsertPoolEntryRequest } from './types'
import type { StartupDTO } from '@/features/startup/types'
import { StartupPicker } from '@/components/StartupPicker'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Label, FieldHint } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { BuildingIcon, PlusIcon } from '@/components/icons'
import { formatDate, sectorOptions, stageLabel, STAGES } from '@/lib/constants'

const interestOptions = Object.values(InterestLevel).map((level) => ({
  value: level,
  label: interestLevelLabels[level],
}))

const stageOptions = STAGES.map((stage) => ({ value: stage.value, label: stage.label }))

const PoolEntryModal = ({
  open,
  onClose,
  entry,
}: {
  open: boolean
  onClose: () => void
  entry: PoolEntryDTO | null
}) => {
  const [startup, setStartup] = useState<StartupDTO | null>(null)
  const [offPlatform, setOffPlatform] = useState(!entry?.startupId)
  const [form, setForm] = useState({
    companyName: entry?.companyName ?? '',
    sector: entry?.sector ?? '',
    stage: entry?.stage ?? '',
    tags: entry?.tags.join(', ') ?? '',
    notes: entry?.notes ?? '',
    interestLevel: entry?.interestLevel ?? InterestLevel.WATCHING,
  })

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UpsertPoolEntryRequest = {
        startupId: offPlatform ? undefined : startup?.id,
        companyName: offPlatform ? form.companyName.trim() : (startup?.name ?? ''),
        sector: (offPlatform ? form.sector : startup?.sector) || undefined,
        stage: (offPlatform ? form.stage : startup?.stage) || undefined,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: form.notes || undefined,
        interestLevel: form.interestLevel,
      }
      return entry ? poolApi.update(entry.id, payload) : poolApi.create(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poolKeys.all })
      onClose()
    },
  })

  const ready = offPlatform ? Boolean(form.companyName.trim()) : Boolean(startup)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit pool entry' : 'Track a company'}
      description="Your private watchlist. Nothing here is visible to the company."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button form="pool-form" type="submit" disabled={!ready || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : entry ? 'Save changes' : 'Add to pool'}
          </Button>
        </>
      }
    >
      <form
        id="pool-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) mutation.mutate()
        }}
        className="space-y-4"
      >
        {!entry && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={offPlatform ? 'outline' : 'primary'}
              size="sm"
              onClick={() => setOffPlatform(false)}
            >
              On platform
            </Button>
            <Button
              type="button"
              variant={offPlatform ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setOffPlatform(true)}
            >
              Not on platform
            </Button>
          </div>
        )}

        {offPlatform ? (
          <>
            <div>
              <Label htmlFor="pool-name" required>
                Company name
              </Label>
              <Input
                id="pool-name"
                value={form.companyName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, companyName: event.target.value }))
                }
                required
              />
              <FieldHint>Track companies that have not signed up yet.</FieldHint>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="pool-sector">Sector</Label>
                <Select
                  id="pool-sector"
                  options={sectorOptions}
                  value={form.sector}
                  placeholder="Select sector"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, sector: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="pool-stage">Stage</Label>
                <Select
                  id="pool-stage"
                  options={stageOptions}
                  value={form.stage}
                  placeholder="Select stage"
                  onChange={(event) => setForm((prev) => ({ ...prev, stage: event.target.value }))}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <Label required>Startup</Label>
            <StartupPicker value={startup} onChange={setStartup} />
          </div>
        )}

        <div>
          <Label htmlFor="pool-interest">Interest level</Label>
          <Select
            id="pool-interest"
            options={interestOptions}
            value={form.interestLevel}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                interestLevel: event.target.value as InterestLevel,
              }))
            }
          />
        </div>

        <div>
          <Label htmlFor="pool-tags">Tags</Label>
          <Input
            id="pool-tags"
            value={form.tags}
            onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
            placeholder="fintech, founder-known, revisit-Q3"
          />
          <FieldHint>Comma separated.</FieldHint>
        </div>

        <div>
          <Label htmlFor="pool-notes">Notes</Label>
          <Textarea
            id="pool-notes"
            rows={3}
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </div>

        {mutation.isError && <Alert variant="danger">{errorMessage(mutation.error)}</Alert>}
      </form>
    </Modal>
  )
}

export const PoolPage = () => {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PoolEntryDTO | null>(null)
  const queryClient = useQueryClient()

  const query = useQuery({ queryKey: poolKeys.all, queryFn: poolApi.list })

  const remove = useMutation({
    mutationFn: (id: string) => poolApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: poolKeys.all }),
  })

  const entries = query.data ?? []

  return (
    <>
      <PageHeader
        title="Pool"
        description="Your firm's private database of companies you're tracking but haven't invested in."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <PlusIcon className="mr-2 h-4 w-4" />
            Track company
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon className="h-6 w-6" />}
          title="Pool is empty"
          description="Add companies you're watching — on or off the platform — with tags and notes only your firm can see."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Track company
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Company</TableHead>
                <TableHead>Sector / stage</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <span className="font-medium text-gray-900">{entry.companyName}</span>
                    {!entry.startupId && (
                      <Badge variant="secondary" className="ml-2">
                        Off platform
                      </Badge>
                    )}
                    {entry.notes && (
                      <span className="mt-0.5 block max-w-xs truncate text-xs text-gray-500">
                        {entry.notes}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {entry.sector ?? '—'}
                    {entry.stage ? ` · ${stageLabel(entry.stage)}` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={interestLevelVariants[entry.interestLevel]}>
                      {interestLevelLabels[entry.interestLevel]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{formatDate(entry.addedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(entry)
                          setFormOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => remove.mutate(entry.id)}
                        disabled={remove.isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {formOpen && (
        <PoolEntryModal
          open
          entry={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}
