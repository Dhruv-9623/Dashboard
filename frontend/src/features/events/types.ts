export enum EventType {
  DEMO_DAY = 'DEMO_DAY',
  NETWORKING = 'NETWORKING',
  OFFICE_HOURS = 'OFFICE_HOURS',
  WEBINAR = 'WEBINAR',
}

export enum RsvpStatus {
  GOING = 'GOING',
  MAYBE = 'MAYBE',
  NOT_GOING = 'NOT_GOING',
}

export interface EventAttendeeDTO {
  id: string
  userId: string
  userEmail: string
  rsvpStatus: RsvpStatus
  rsvpAt: string
}

export interface EventDTO {
  id: string
  title: string
  description: string | null
  eventType: EventType
  hostName: string
  hostUserId: string
  startTime: string
  endTime: string | null
  location: string | null
  virtualLink: string | null
  isPublic: boolean
  attendeeCount: number
  myRsvp: RsvpStatus | null
}

export interface CreateEventRequest {
  title: string
  description?: string
  eventType: EventType
  startTime: string
  endTime?: string
  location?: string
  virtualLink?: string
  isPublic: boolean
}

export const eventTypeLabels: Record<EventType, string> = {
  [EventType.DEMO_DAY]: 'Demo day',
  [EventType.NETWORKING]: 'Networking',
  [EventType.OFFICE_HOURS]: 'Office hours',
  [EventType.WEBINAR]: 'Webinar',
}

export const rsvpLabels: Record<RsvpStatus, string> = {
  [RsvpStatus.GOING]: 'Going',
  [RsvpStatus.MAYBE]: 'Maybe',
  [RsvpStatus.NOT_GOING]: 'Not going',
}
