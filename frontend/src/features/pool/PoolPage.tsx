import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { poolApi, poolKeys } from './api'
import { InterestLevel, interestLevelLabels, interestLevelVariants } from './types'
import type { PoolEntryDTO, UpsertPoolEntryRequest } from './types'
import type { StartupDTO } from '@/features/startup/types'
import { StartupPicker } from '@/components/StartupPicker'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useFieldErrors } from '@/lib/useFieldErrors'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Label, FieldError, FieldHint } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { SkeletonRows } from '@/components/ui/Skeleton'
import {
  Table,
  TableBody,
  TableCard,
  TableCardList,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableSurface,
} from '@/components/ui/Table'
import { EntityAvatar } from '@/components/ui/EntityAvatar'
import { RowActions } from '@/components/ui/RowActions'
import { PoolInvitation } from '@/components/PoolInvitation'
import { TrashIcon } from '@/components/icons'
import { useEntrance } from '@/lib/useMotion'
import { BuildingIcon, PlusIcon } from '@/components/icons'
import { formatDate, sectorOptions, stageLabel, STAGES } from '@/lib/constants'

const interestOptions = Object.values(InterestLevel).map((level) => ({
  value: level,
  label: interestLevelLabels[level],
}))

const stageOptions = STAGES.map((stage) => ({ value: stage.value, label: stage.label }))

const PAGE_SIZE = 20

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
  const toast = useToast()

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
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: poolKeys.all })
      toast.success(entry ? `Updated ${saved.companyName}` : `${saved.companyName} added to your pool`)
      onClose()
    },
  })

  const fields = useFieldErrors(mutation.error)

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
                {...fields.a11y('companyName', 'pool-name')}
              />
              {fields.message('companyName') ? (
                <FieldError id={fields.errorId('pool-name')}>{fields.message('companyName')}</FieldError>
              ) : (
                <FieldHint>Track companies that have not signed up yet.</FieldHint>
              )}
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

        {mutation.isError && (
          <Alert variant="danger">{fields.summary((error) => errorMessage(error))}</Alert>
        )}
      </form>
    </Modal>
  )
}

export const PoolPage = () => {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PoolEntryDTO | null>(null)
  const [deleting, setDeleting] = useState<PoolEntryDTO | null>(null)
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()
  const toast = useToast()

  const listParams = { page, size: PAGE_SIZE }
  const query = useQuery({
    queryKey: poolKeys.list(listParams),
    queryFn: () => poolApi.list(listParams),
    placeholderData: keepPreviousData,
  })

  const remove = useMutation({
    mutationFn: (id: string) => poolApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poolKeys.all })
      toast.success(deleting ? `${deleting.companyName} removed from your pool` : 'Entry removed')
      setDeleting(null)
    },
  })

  const entries = query.data?.items ?? []
  const cardsRef = useEntrance<HTMLUListElement>(page)
  // Aggregated over the page in hand, which is what the footer line describes.
  const highPriority = entries.filter(
    (entry) => entry.interestLevel === InterestLevel.HIGH_PRIORITY
  ).length

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
        <>
          {/* Phone: one card per company — six columns can't reflow honestly. */}
          <TableCardList ref={cardsRef}>
            {entries.map((entry) => (
              <TableCard key={entry.id}>
                <div className="flex items-start gap-3">
                  <EntityAvatar name={entry.companyName ?? 'Company'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{entry.companyName}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {entry.sector ?? '—'}
                      {entry.stage ? ` · ${stageLabel(entry.stage)}` : ''}
                    </p>
                  </div>
                  <Badge variant={interestLevelVariants[entry.interestLevel]} dot>
                    {interestLevelLabels[entry.interestLevel]}
                  </Badge>
                </div>
                {entry.notes && (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-secondary">
                    {entry.notes}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <span className="text-xs text-ink-muted">{formatDate(entry.addedAt)}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditing(entry)
                        setFormOpen(true)
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(entry)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </TableCard>
            ))}
          </TableCardList>

          <TableSurface className="max-sm:hidden">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Company</TableHead>
                  <TableHead>Sector / stage</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <EntityAvatar name={entry.companyName ?? 'Company'} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-ink">{entry.companyName}</span>
                            {!entry.startupId && (
                              <Badge variant="outline" className="shrink-0">
                                Off platform
                              </Badge>
                            )}
                          </div>
                          {entry.notes && (
                            <span className="mt-0.5 block max-w-xs truncate text-xs text-ink-muted">
                              {entry.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell muted className="whitespace-nowrap">
                      {entry.sector ?? '—'}
                      {entry.stage ? ` · ${stageLabel(entry.stage)}` : ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={interestLevelVariants[entry.interestLevel]} dot>
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
                        {entry.tags.length > 3 && (
                          <span className="text-xs text-ink-muted">+{entry.tags.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell muted className="whitespace-nowrap">
                      {formatDate(entry.addedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        label={`Actions for ${entry.companyName ?? 'company'}`}
                        actions={[
                          {
                            label: 'Edit entry',
                            onSelect: () => {
                              setEditing(entry)
                              setFormOpen(true)
                            },
                          },
                          ...(entry.startupId
                            ? [
                                {
                                  label: 'View company',
                                  to: `/startups/${entry.startupId}`,
                                  onSelect: () => undefined,
                                },
                              ]
                            : []),
                          {
                            label: 'Remove',
                            destructive: true,
                            icon: <TrashIcon className="size-4" aria-hidden="true" />,
                            onSelect: () => setDeleting(entry),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <tr>
                  <td colSpan={6} className="px-4">
                    {entries.length} of {query.data?.totalElements ?? entries.length} tracked
                    {highPriority > 0 ? ` · ${highPriority} high priority` : ''}
                  </td>
                </tr>
              </TableFooter>
            </Table>
          </TableSurface>
        </>
      )}

      {entries.length > 0 && entries.length < 8 && (
        <PoolInvitation
          className="mt-4"
          title="Your pool has room"
          description="The companies you track here are the ones Deal Flow, Conflict Sentinel and your AI matches all read from. The more you watch, the better they get."
          action={
            <Button
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <PlusIcon className="size-4" aria-hidden="true" />
              Track a company
            </Button>
          }
        />
      )}

      {query.data && (
        <Pagination
          page={query.data.page}
          totalPages={query.data.totalPages}
          totalElements={query.data.totalElements}
          size={query.data.size}
          onPageChange={setPage}
          label="companies"
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove from pool"
        description={deleting ? `${deleting.companyName} will be removed from your firm's pool.` : undefined}
        confirmLabel="Remove"
        pendingLabel="Removing…"
        isPending={remove.isPending}
        error={remove.error}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onCancel={() => {
          setDeleting(null)
          remove.reset()
        }}
      >
        <p className="text-sm text-ink-secondary">Your notes and tags for this company will be deleted.</p>
      </ConfirmDialog>

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
