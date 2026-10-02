import { fetchApi, withQuery } from '@/lib/api-client'
import type { PageParams, PageResponse } from '@/lib/api-client'
import type { InterestLevel, PoolEntryDTO, UpsertPoolEntryRequest } from './types'

export interface PoolListParams extends PageParams {
  interestLevel?: InterestLevel
}

export const poolApi = {
  /** The signed-in VC's firm's pool, most recently added first. */
  list: (params: PoolListParams = {}) =>
    fetchApi<PageResponse<PoolEntryDTO>>(withQuery('/api/pool', { ...params })),

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
  /** Prefix for everything pool-related: invalidate this after any write. */
  all: ['pool'] as const,
  list: (params: PoolListParams) => ['pool', 'list', params] as const,
}
