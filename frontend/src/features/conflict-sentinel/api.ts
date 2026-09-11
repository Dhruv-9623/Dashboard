import { fetchApi } from '@/lib/api-client'
import type { ConflictReportDTO } from './types'

export const conflictApi = {
  run: (opportunityId: string) =>
    fetchApi<ConflictReportDTO>(`/api/opportunities/${opportunityId}/conflict-check`, {
      method: 'POST',
    }),

  getForOpportunity: (opportunityId: string) =>
    fetchApi<ConflictReportDTO | null>(`/api/opportunities/${opportunityId}/conflict-report`),

  listReports: () => fetchApi<ConflictReportDTO[]>('/api/conflict-reports'),
}

export const conflictKeys = {
  all: ['conflict-reports'] as const,
  forOpportunity: (id: string) => ['conflict-reports', 'opportunity', id] as const,
}
