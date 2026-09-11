export enum ConflictDimension {
  SECTOR_OVERLAP = 'SECTOR_OVERLAP',
  CUSTOMER_OVERLAP = 'CUSTOMER_OVERLAP',
  COMPETITIVE_PRODUCT = 'COMPETITIVE_PRODUCT',
}

export interface ConflictMatch {
  portfolioCompanyId: string
  portfolioCompanyName: string
  note: string
}

export interface ConflictDimensionResult {
  dimension: ConflictDimension
  /** 0–1 */
  confidence: number
  summary: string
  matches: ConflictMatch[]
}

export interface ConflictReportDTO {
  id: string
  opportunityId: string
  opportunityName: string
  /** 0–1, blended across dimensions. Shown alongside the per-dimension breakdown. */
  overallConfidence: number
  dimensions: ConflictDimensionResult[]
  comparedCompanyCount: number
  generatedAt: string
}

export const dimensionLabels: Record<ConflictDimension, string> = {
  [ConflictDimension.SECTOR_OVERLAP]: 'Sector overlap',
  [ConflictDimension.CUSTOMER_OVERLAP]: 'Customer overlap',
  [ConflictDimension.COMPETITIVE_PRODUCT]: 'Competitive product',
}

export const dimensionDescriptions: Record<ConflictDimension, string> = {
  [ConflictDimension.SECTOR_OVERLAP]:
    'The candidate operates in a sector where the fund already holds positions.',
  [ConflictDimension.CUSTOMER_OVERLAP]:
    'The candidate sells to buyers that existing portfolio companies also target.',
  [ConflictDimension.COMPETITIVE_PRODUCT]:
    'The candidate ships a product that competes directly with a holding.',
}

export const confidenceBand = (confidence: number) => {
  if (confidence >= 0.66) return { label: 'High', tone: 'red' as const, variant: 'danger' as const }
  if (confidence >= 0.33)
    return { label: 'Moderate', tone: 'amber' as const, variant: 'warning' as const }
  return { label: 'Low', tone: 'green' as const, variant: 'success' as const }
}
