export enum OpportunityStatus {
  SCORING = 'SCORING',
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_MORE_INFO = 'NEEDS_MORE_INFO',
}

export enum RecommendedAction {
  PURSUE = 'PURSUE',
  PASS = 'PASS',
  NEEDS_MORE_INFO = 'NEEDS_MORE_INFO',
}

/** A single claim the scoring agent made, tied back to the thesis field it came from. */
export interface ScoreCitation {
  claim: string
  thesisField: string
  supporting: boolean
}

export interface OpportunityDTO {
  id: string
  firmId: string
  companyName: string
  website: string | null
  sector: string
  stage: string
  askAmount: number | null
  currency: string
  description: string | null
  contactEmail: string | null
  fitScore: number | null
  rationale: string | null
  citations: ScoreCitation[]
  recommendedAction: RecommendedAction | null
  status: OpportunityStatus
  decisionNote: string | null
  scoredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOpportunityRequest {
  companyName: string
  website?: string
  sector: string
  stage: string
  askAmount?: number
  currency: string
  description?: string
  contactEmail?: string
}

export interface DecideOpportunityRequest {
  status: OpportunityStatus
  decisionNote?: string
}

export const statusLabels: Record<OpportunityStatus, string> = {
  [OpportunityStatus.SCORING]: 'Scoring',
  [OpportunityStatus.PENDING_REVIEW]: 'Pending review',
  [OpportunityStatus.APPROVED]: 'Approved',
  [OpportunityStatus.REJECTED]: 'Rejected',
  [OpportunityStatus.NEEDS_MORE_INFO]: 'Needs more info',
}

export const actionLabels: Record<RecommendedAction, string> = {
  [RecommendedAction.PURSUE]: 'Pursue',
  [RecommendedAction.PASS]: 'Pass',
  [RecommendedAction.NEEDS_MORE_INFO]: 'Needs more info',
}
