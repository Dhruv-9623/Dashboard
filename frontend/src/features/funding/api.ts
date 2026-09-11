import { fetchApi } from '@/lib/api-client'
import type {
  CreateCommitmentRequest,
  FundingCommitmentDTO,
  FundingCycleDTO,
  UpsertFundingCycleRequest,
} from './types'

export const fundingApi = {
  /** Rounds owned by the signed-in founder's startup. */
  listMine: () => fetchApi<FundingCycleDTO[]>('/api/funding-cycles'),

  /** Open rounds across the platform — the VC-side deal flow. */
  listOpen: (sector?: string, stage?: string) => {
    const query = new URLSearchParams()
    if (sector) query.set('sector', sector)
    if (stage) query.set('stage', stage)
    const encoded = query.toString()
    return fetchApi<FundingCycleDTO[]>(
      `/api/funding-cycles/open${encoded ? `?${encoded}` : ''}`
    )
  },

  get: (id: string) => fetchApi<FundingCycleDTO>(`/api/funding-cycles/${id}`),

  create: (request: UpsertFundingCycleRequest) =>
    fetchApi<FundingCycleDTO>('/api/funding-cycles', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  update: (id: string, request: UpsertFundingCycleRequest) =>
    fetchApi<FundingCycleDTO>(`/api/funding-cycles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  listCommitments: (cycleId: string) =>
    fetchApi<FundingCommitmentDTO[]>(`/api/funding-cycles/${cycleId}/commitments`),

  commit: (cycleId: string, request: CreateCommitmentRequest) =>
    fetchApi<FundingCommitmentDTO>(`/api/funding-cycles/${cycleId}/commitments`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  updateCommitment: (commitmentId: string, status: string) =>
    fetchApi<FundingCommitmentDTO>(`/api/commitments/${commitmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

export const fundingKeys = {
  mine: ['funding-cycles', 'mine'] as const,
  open: (sector?: string, stage?: string) =>
    ['funding-cycles', 'open', sector ?? '', stage ?? ''] as const,
  detail: (id: string) => ['funding-cycles', id] as const,
  commitments: (id: string) => ['funding-cycles', id, 'commitments'] as const,
}
