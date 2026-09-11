import { fetchApi } from '@/lib/api-client'
import type { InvestmentDTO, UpsertInvestmentRequest } from './types'

export const investmentApi = {
  list: () => fetchApi<InvestmentDTO[]>('/api/investments'),

  get: (id: string) => fetchApi<InvestmentDTO>(`/api/investments/${id}`),

  create: (request: UpsertInvestmentRequest) =>
    fetchApi<InvestmentDTO>('/api/investments', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  update: (id: string, request: UpsertInvestmentRequest) =>
    fetchApi<InvestmentDTO>(`/api/investments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  remove: (id: string) => fetchApi<void>(`/api/investments/${id}`, { method: 'DELETE' }),
}

export const investmentKeys = {
  all: ['investments'] as const,
  detail: (id: string) => ['investments', id] as const,
}
