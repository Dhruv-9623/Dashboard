import { fetchApi } from '@/lib/api-client'
import type { StartupDTO } from '@/features/startup/types'

export interface ComparisonRowDTO {
  startup: StartupDTO
  totalRaised: number | null
  currency: string
  openRound: string | null
  investorCount: number
}

export const comparisonApi = {
  compare: (startupIds: string[]) =>
    fetchApi<ComparisonRowDTO[]>('/api/comparison', {
      method: 'POST',
      body: JSON.stringify({ startupIds }),
    }),
}

export const comparisonKeys = {
  forIds: (ids: string[]) => ['comparison', [...ids].sort().join(',')] as const,
}
