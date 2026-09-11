import { fetchApi } from '@/lib/api-client'
import type {
  CreateOpportunityRequest,
  DecideOpportunityRequest,
  OpportunityDTO,
  OpportunityStatus,
} from './types'

export const opportunityApi = {
  list: (status?: OpportunityStatus) =>
    fetchApi<OpportunityDTO[]>(
      status ? `/api/opportunities?status=${status}` : '/api/opportunities'
    ),

  get: (id: string) => fetchApi<OpportunityDTO>(`/api/opportunities/${id}`),

  create: (request: CreateOpportunityRequest) =>
    fetchApi<OpportunityDTO>('/api/opportunities', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  decide: (id: string, request: DecideOpportunityRequest) =>
    fetchApi<OpportunityDTO>(`/api/opportunities/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    }),

  rescore: (id: string) =>
    fetchApi<OpportunityDTO>(`/api/opportunities/${id}/rescore`, { method: 'POST' }),
}

export const opportunityKeys = {
  all: ['opportunities'] as const,
  list: (status?: OpportunityStatus) => ['opportunities', 'list', status ?? 'all'] as const,
  detail: (id: string) => ['opportunities', 'detail', id] as const,
}
