import { fetchApi, withQuery } from '@/lib/api-client'
import type { PageParams, PageResponse } from '@/lib/api-client'
import type { InvestmentDTO, InvestmentStatus, InvestmentSummaryDTO, UpsertInvestmentRequest } from './types'

export interface InvestmentListParams extends PageParams {
  status?: InvestmentStatus
}

export const investmentApi = {
  /** The signed-in VC's firm's investments, newest first. */
  list: (params: InvestmentListParams = {}) =>
    fetchApi<PageResponse<InvestmentDTO>>(withQuery('/api/investments', { ...params })),

  summary: () => fetchApi<InvestmentSummaryDTO>('/api/investments/summary'),

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
  /** Prefix for everything investment-related: invalidate this after any write. */
  all: ['investments'] as const,
  list: (params: InvestmentListParams) => ['investments', 'list', params] as const,
  summary: ['investments', 'summary'] as const,
  detail: (id: string) => ['investments', id] as const,
}
