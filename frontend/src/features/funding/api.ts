import { fetchApi, withQuery } from '@/lib/api-client'
import type { PageParams, PageResponse } from '@/lib/api-client'
import type {
  BookSummaryDTO,
  CommitmentEventDTO,
  ConvertCommitmentRequest,
  CreateCommitmentRequest,
  FundingCommitmentDTO,
  FundingCycleDTO,
  UpsertFundingCycleRequest,
} from './types'

export interface DealFlowParams extends PageParams {
  sector?: string
  stage?: string
  /** One startup's open round, for its profile page — avoids paging all of deal flow. */
  startupId?: string
}

export interface CommitmentBookParams extends PageParams {
  status?: string
}

export const fundingApi = {
  /** Rounds owned by the signed-in founder's startup. */
  listMine: () => fetchApi<FundingCycleDTO[]>('/api/funding-cycles'),

  /**
   * Open rounds across the platform — the VC-side deal flow.
   *
   * Paged, unlike the founder's own list: this one grows with the whole market.
   */
  listOpen: (params: DealFlowParams = {}) =>
    fetchApi<PageResponse<FundingCycleDTO>>(withQuery('/api/funding-cycles/open', { ...params })),

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

  /**
   * The signed-in firm's own commitments, across every round — money promised, not yet deployed.
   *
   * No firm id in the request: the server scopes it to the session, so there is no parameter that
   * could be changed to read another fund's book.
   */
  listMyCommitments: (params: CommitmentBookParams = {}) =>
    fetchApi<PageResponse<FundingCommitmentDTO>>(withQuery('/api/commitments', { ...params })),

  /**
   * The firm's book as totals, across every pledge.
   *
   * Separate from `listMyCommitments` on purpose: the list is paged and filterable, so totalling
   * it client-side produced headline figures that changed with the page and the selected band.
   */
  bookSummary: () => fetchApi<BookSummaryDTO>('/api/commitments/summary'),

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

  /**
   * How the round filled, oldest move first.
   *
   * The founder gets every investor's moves; an investor gets only its own firm's. The server
   * decides which, from the session — there is no parameter that selects the wider view.
   */
  listHistory: (cycleId: string) =>
    fetchApi<CommitmentEventDTO[]>(`/api/funding-cycles/${cycleId}/history`),

  /** Record a closed round's pledge as an investment. Creates a portfolio row and links it. */
  convert: (commitmentId: string, request: ConvertCommitmentRequest = {}) =>
    fetchApi<FundingCommitmentDTO>(`/api/commitments/${commitmentId}/convert`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),
}

export const fundingKeys = {
  mine: ['funding-cycles', 'mine'] as const,
  book: (params: CommitmentBookParams) => ['commitments', 'book', params] as const,
  bookSummary: ['commitments', 'summary'] as const,
  open: (params: DealFlowParams) => ['funding-cycles', 'open', params] as const,
  detail: (id: string) => ['funding-cycles', id] as const,
  commitments: (id: string) => ['funding-cycles', id, 'commitments'] as const,
  history: (id: string) => ['funding-cycles', id, 'history'] as const,
}
