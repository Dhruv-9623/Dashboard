import { fetchApi } from '@/lib/api-client'
import type { CreateEventRequest, EventAttendeeDTO, EventDTO, RsvpStatus } from './types'

export const eventApi = {
  list: (upcomingOnly = true) =>
    fetchApi<EventDTO[]>(`/api/events?upcoming=${upcomingOnly}`),

  get: (id: string) => fetchApi<EventDTO>(`/api/events/${id}`),

  create: (request: CreateEventRequest) =>
    fetchApi<EventDTO>('/api/events', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  rsvp: (id: string, rsvpStatus: RsvpStatus) =>
    fetchApi<EventDTO>(`/api/events/${id}/rsvp`, {
      method: 'POST',
      body: JSON.stringify({ rsvpStatus }),
    }),

  listAttendees: (id: string) => fetchApi<EventAttendeeDTO[]>(`/api/events/${id}/attendees`),
}

export const eventKeys = {
  all: (upcomingOnly: boolean) => ['events', upcomingOnly] as const,
  detail: (id: string) => ['events', id] as const,
  attendees: (id: string) => ['events', id, 'attendees'] as const,
}
