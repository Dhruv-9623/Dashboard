import { fetchApi } from '@/lib/api-client'
import type { DigestDTO } from './types'

export const digestApi = {
  list: () => fetchApi<DigestDTO[]>('/api/digests'),

  get: (id: string) => fetchApi<DigestDTO>(`/api/digests/${id}`),

  generate: () => fetchApi<DigestDTO>('/api/digests/generate', { method: 'POST' }),
}

export const portfolioKeys = {
  digests: ['digests'] as const,
  digest: (id: string) => ['digests', id] as const,
}
