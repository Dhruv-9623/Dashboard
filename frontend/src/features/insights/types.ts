export interface FunnelStageDTO {
  label: string
  count: number
}

export interface SectorBreakdownDTO {
  sector: string
  count: number
  amount: number
}

/**
 * Derived analytics — the backend computes these from existing tables rather than
 * persisting an entity (CLAUDE.md §10).
 */
export interface InsightsDTO {
  profileViews: number
  connectionRequestsReceived: number
  connectionRequestsAccepted: number
  activeConversations: number
  wishlistedByCount: number
  /** VC-side: deployed capital and holdings. Startup-side: raised and commitments. */
  totalAmount: number
  currency: string
  entityCount: number
  funnel: FunnelStageDTO[]
  sectorBreakdown: SectorBreakdownDTO[]
  generatedAt: string
}
