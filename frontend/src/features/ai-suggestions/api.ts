import { fetchApi } from '@/lib/api-client'
import type { AISuggestionDTO, SuggestionStatus } from './types'

export const suggestionApi = {
  list: () => fetchApi<AISuggestionDTO[]>('/api/ai/suggestions'),

  setStatus: (id: string, status: SuggestionStatus) =>
    fetchApi<AISuggestionDTO>(`/api/ai/suggestions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  regenerate: () => fetchApi<void>('/api/ai/suggestions/regenerate', { method: 'POST' }),
}

export const suggestionKeys = {
  all: ['ai-suggestions'] as const,
}
