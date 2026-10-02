import { fetchApi, withQuery } from '@/lib/api-client'
import type { PageParams, PageResponse } from '@/lib/api-client'
import type {
  StartupDTO,
  StartupMemberDTO,
  StartupRole,
  StartupSearchParams,
  UpsertStartupRequest,
} from './types'

export const startupApi = {
  /** Discovery, paged and alphabetical. */
  search: (params: StartupSearchParams & PageParams = {}) =>
    fetchApi<PageResponse<StartupDTO>>(withQuery('/api/startups', { ...params })),

  get: (id: string) => fetchApi<StartupDTO>(`/api/startups/${id}`),

  /** The startup the signed-in founder belongs to, or null before setup. */
  getMine: () => fetchApi<StartupDTO | null>('/api/startups/me'),

  create: (request: UpsertStartupRequest) =>
    fetchApi<StartupDTO>('/api/startups', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  update: (id: string, request: UpsertStartupRequest) =>
    fetchApi<StartupDTO>(`/api/startups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  getMembers: (id: string) => fetchApi<StartupMemberDTO[]>(`/api/startups/${id}/members`),

  addMember: (id: string, email: string, role: StartupRole) =>
    fetchApi<StartupMemberDTO>(`/api/startups/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),

  removeMember: (id: string, memberId: string) =>
    fetchApi<void>(`/api/startups/${id}/members/${memberId}`, { method: 'DELETE' }),
}

export const startupKeys = {
  all: ['startups'] as const,
  mine: ['startups', 'me'] as const,
  search: (params: StartupSearchParams & PageParams) => ['startups', 'search', params] as const,
  detail: (id: string) => ['startups', 'detail', id] as const,
  members: (id: string) => ['startups', id, 'members'] as const,
}
