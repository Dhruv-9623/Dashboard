import { fetchApi } from '@/lib/api-client'
import type { InsightsDTO } from './types'

export const insightsApi = {
  get: () => fetchApi<InsightsDTO>('/api/insights'),
}

export const insightsKeys = {
  all: ['insights'] as const,
}
