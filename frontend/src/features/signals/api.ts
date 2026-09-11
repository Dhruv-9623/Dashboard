import { fetchApi } from '@/lib/api-client'
import type { SignalDTO, SignalType } from './types'

export const signalApi = {
  list: (signalType?: SignalType) =>
    fetchApi<SignalDTO[]>(signalType ? `/api/signals?type=${signalType}` : '/api/signals'),
}

export const signalKeys = {
  all: (signalType?: SignalType) => ['signals', signalType ?? 'all'] as const,
}
