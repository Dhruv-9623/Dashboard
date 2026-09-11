import { fetchApi } from '@/lib/api-client'
import type { PoolEntryDTO, UpsertPoolEntryRequest } from './types'

export const poolApi = {
  list: () => fetchApi<PoolEntryDTO[]>('/api/pool'),

  create: (request: UpsertPoolEntryRequest) =>
    fetchApi<PoolEntryDTO>('/api/pool', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  update: (id: string, request: UpsertPoolEntryRequest) =>
    fetchApi<PoolEntryDTO>(`/api/pool/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  remove: (id: string) => fetchApi<void>(`/api/pool/${id}`, { method: 'DELETE' }),
}

export const poolKeys = {
  all: ['pool'] as const,
}
