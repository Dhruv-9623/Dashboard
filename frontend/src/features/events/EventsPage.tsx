import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eventApi, eventKeys } from './api'
import { EventType, RsvpStatus, eventTypeLabels, rsvpLabels } from './types'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { Tabs } from '@/components/ui/Tabs'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { CalendarIcon, PlusIcon, UsersIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/constants'

const typeOptions = Object.values(EventType).map((type) => ({
  value: type,
  label: eventTypeLabels[type],
}))

const CreateEventModal = ({ onClose }: { onClose: () => void }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    eventType: EventType.NETWORKING,
    startTime: '',
    endTime: '',
    location: '',
    virtualLink: '',
    isPublic: true,
  })

  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      eventApi.create({
        title: form.title.trim(),
        description: form.description || undefined,
        eventType: form.eventType,
        startTime: new Date(form.startTime).toISOString(),
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
        location: form.location || undefined,
        virtualLink: form.virtualLink || undefined,
        isPublic: form.isPublic,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      onClose()
    },
  })

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const ready = form.title.trim() && form.startTime

  return (
    <Modal
      open
      onClose={onClose}
      title="Host an event"
      description="Demo days, office hours, webinars, and networking sessions."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button form="event-form" type="submit" disabled={!ready || mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create event'}
          </Button>
        </>
      }
    >
      <form
        id="event-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) mutation.mutate()
        }}
        className="space-y-4"
      >
        <div>
          <Label htmlFor="event-title" required>
            Title
          </Label>
          <Input
            id="event-title"
            value={form.title}
            onChange={(event) => set('title', event.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="event-type">Type</Label>
          <Select
            id="event-type"
            options={typeOptions}
            value={form.eventType}
            onChange={(event) => set('eventType', event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="event-start" required>
              Starts
            </Label>
            <Input
              id="event-start"
              type="datetime-local"
              value={form.startTime}
              onChange={(event) => set('startTime', event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="event-end">Ends</Label>
            <Input
              id="event-end"
              type="datetime-local"
              value={form.endTime}
              onChange={(event) => set('endTime', event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="event-location">Location</Label>
            <Input
              id="event-location"
              value={form.location}
              onChange={(event) => set('location', event.target.value)}
              placeholder="Bengaluru, or leave blank"
            />
          </div>
          <div>
            <Label htmlFor="event-link">Virtual link</Label>
            <Input
              id="event-link"
              type="url"
              value={form.virtualLink}
              onChange={(event) => set('virtualLink', event.target.value)}
              placeholder="https://"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="event-description">Description</Label>
          <Textarea
            id="event-description"
            rows={3}
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(event) => set('isPublic', event.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Visible to everyone on the platform
        </label>

        {mutation.isError && <Alert variant="danger">{errorMessage(mutation.error)}</Alert>}
      </form>
    </Modal>
  )
}

export const EventsPage = () => {
  const [upcoming, setUpcoming] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: eventKeys.all(upcoming),
    queryFn: () => eventApi.list(upcoming),
  })

  const rsvp = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RsvpStatus }) => eventApi.rsvp(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  })

  const events = query.data ?? []

  return (
    <>
      <PageHeader
        title="Events"
        description="Demo days, networking, office hours, and webinars across the platform."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Host event
          </Button>
        }
      />

      <Tabs
        className="mb-5"
        value={upcoming ? 'upcoming' : 'past'}
        onChange={(value) => setUpcoming(value === 'upcoming')}
        items={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'past', label: 'Past' },
        ]}
      />

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon className="h-6 w-6" />}
          title={upcoming ? 'No upcoming events' : 'No past events'}
          description="Host one to bring founders and investors together."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Host event
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id}>
              <CardContent className="py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{eventTypeLabels[event.eventType]}</Badge>
                  {!event.isPublic && <Badge variant="warning">Private</Badge>}
                  <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500">
                    <UsersIcon className="h-3.5 w-3.5" />
                    {event.attendeeCount}
                  </span>
                </div>

                <h2 className="mt-2 text-base font-semibold text-gray-900">{event.title}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDateTime(event.startTime)}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">Hosted by {event.hostName}</p>

                {event.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">{event.description}</p>
                )}

                {upcoming && (
                  <div className="mt-4 flex gap-2">
                    {Object.values(RsvpStatus).map((status) => (
                      <Button
                        key={status}
                        size="sm"
                        variant={event.myRsvp === status ? 'primary' : 'outline'}
                        onClick={() => rsvp.mutate({ id: event.id, status })}
                        disabled={rsvp.isPending}
                        className={cn(status === RsvpStatus.NOT_GOING && 'ml-auto')}
                      >
                        {rsvpLabels[status]}
                      </Button>
                    ))}
                  </div>
                )}

                {event.virtualLink && (
                  <a
                    href={event.virtualLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-3 inline-block text-sm text-blue-600 hover:underline"
                  >
                    Join link
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {createOpen && <CreateEventModal onClose={() => setCreateOpen(false)} />}
    </>
  )
}
