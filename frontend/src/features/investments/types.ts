export enum InvestmentStatus {
  ACTIVE = 'ACTIVE',
  EXITED = 'EXITED',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

export enum InvestmentRound {
  PRE_SEED = 'PRE_SEED',
  SEED = 'SEED',
  SERIES_A = 'SERIES_A',
  SERIES_B = 'SERIES_B',
  SERIES_C = 'SERIES_C',
  GROWTH = 'GROWTH',
}

export interface InvestmentDTO {
  id: string
  vcFirmId: string
  startupId: string
  startupName: string
  startupSector: string
  startupLogoUrl: string | null
  investmentDate: string
  amount: number
  currency: string
  round: InvestmentRound
  equityPercentage: number | null
  status: InvestmentStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertInvestmentRequest {
  startupId: string
  investmentDate: string
  amount: number
  currency: string
  round: InvestmentRound
  equityPercentage?: number
  status: InvestmentStatus
  notes?: string
}

export const investmentStatusLabels: Record<InvestmentStatus, string> = {
  [InvestmentStatus.ACTIVE]: 'Active',
  [InvestmentStatus.EXITED]: 'Exited',
  [InvestmentStatus.WRITTEN_OFF]: 'Written off',
}

export const roundLabels: Record<InvestmentRound, string> = {
  [InvestmentRound.PRE_SEED]: 'Pre-Seed',
  [InvestmentRound.SEED]: 'Seed',
  [InvestmentRound.SERIES_A]: 'Series A',
  [InvestmentRound.SERIES_B]: 'Series B',
  [InvestmentRound.SERIES_C]: 'Series C',
  [InvestmentRound.GROWTH]: 'Growth',
}
