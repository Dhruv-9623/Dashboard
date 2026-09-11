export enum FundingCycleStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PAUSED = 'PAUSED',
}

export enum CommitmentStatus {
  INDICATED = 'INDICATED',
  SOFT_COMMITTED = 'SOFT_COMMITTED',
  COMMITTED = 'COMMITTED',
}

export interface FundingCommitmentDTO {
  id: string
  fundingCycleId: string
  vcFirmId: string
  vcFirmName: string
  amount: number
  currency: string
  status: CommitmentStatus
  committedAt: string
}

export interface FundingCycleDTO {
  id: string
  startupId: string
  startupName: string
  startupSector: string
  startupStage: string
  roundType: string
  targetAmount: number
  currency: string
  minTicketSize: number | null
  maxTicketSize: number | null
  status: FundingCycleStatus
  pitchDeckUrl: string | null
  dataRoomUrl: string | null
  openedAt: string
  closedAt: string | null
  committedAmount: number
  commitmentCount: number
}

export interface UpsertFundingCycleRequest {
  roundType: string
  targetAmount: number
  currency: string
  minTicketSize?: number
  maxTicketSize?: number
  status: FundingCycleStatus
  pitchDeckUrl?: string
  dataRoomUrl?: string
}

export interface CreateCommitmentRequest {
  amount: number
  currency: string
  status: CommitmentStatus
}

export const cycleStatusLabels: Record<FundingCycleStatus, string> = {
  [FundingCycleStatus.OPEN]: 'Open',
  [FundingCycleStatus.CLOSED]: 'Closed',
  [FundingCycleStatus.PAUSED]: 'Paused',
}

export const cycleStatusVariants: Record<
  FundingCycleStatus,
  'success' | 'secondary' | 'warning'
> = {
  [FundingCycleStatus.OPEN]: 'success',
  [FundingCycleStatus.CLOSED]: 'secondary',
  [FundingCycleStatus.PAUSED]: 'warning',
}

export const commitmentStatusLabels: Record<CommitmentStatus, string> = {
  [CommitmentStatus.INDICATED]: 'Indicated',
  [CommitmentStatus.SOFT_COMMITTED]: 'Soft committed',
  [CommitmentStatus.COMMITTED]: 'Committed',
}

export const commitmentStatusVariants: Record<
  CommitmentStatus,
  'secondary' | 'warning' | 'success'
> = {
  [CommitmentStatus.INDICATED]: 'secondary',
  [CommitmentStatus.SOFT_COMMITTED]: 'warning',
  [CommitmentStatus.COMMITTED]: 'success',
}
