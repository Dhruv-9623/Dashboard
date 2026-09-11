import { fetchApi } from '@/lib/api-client'
import type { CreateOutreachRequest, OutreachDTO } from './types'

export const outreachApi = {
  list: () => fetchApi<OutreachDTO[]>('/api/outreach'),

  send: (request: CreateOutreachRequest) =>
    fetchApi<OutreachDTO>('/api/outreach', {
      method: 'POST',
      body: JSON.stringify(request),
    }),
}

export const outreachKeys = {
  all: ['outreach'] as const,
}
