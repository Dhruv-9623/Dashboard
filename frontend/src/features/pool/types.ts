export enum InterestLevel {
  WATCHING = 'WATCHING',
  INTERESTED = 'INTERESTED',
  HIGH_PRIORITY = 'HIGH_PRIORITY',
}

export interface PoolEntryDTO {
  id: string
  vcFirmId: string
  /** Null when tracking a company that is not on the platform yet. */
  startupId: string | null
  companyName: string
  sector: string | null
  stage: string | null
  addedByEmail: string
  tags: string[]
  notes: string | null
  interestLevel: InterestLevel
  addedAt: string
}

export interface UpsertPoolEntryRequest {
  startupId?: string
  companyName: string
  sector?: string
  stage?: string
  tags: string[]
  notes?: string
  interestLevel: InterestLevel
}

export const interestLevelLabels: Record<InterestLevel, string> = {
  [InterestLevel.WATCHING]: 'Watching',
  [InterestLevel.INTERESTED]: 'Interested',
  [InterestLevel.HIGH_PRIORITY]: 'High priority',
}

export const interestLevelVariants: Record<
  InterestLevel,
  'secondary' | 'default' | 'warning'
> = {
  [InterestLevel.WATCHING]: 'secondary',
  [InterestLevel.INTERESTED]: 'default',
  [InterestLevel.HIGH_PRIORITY]: 'warning',
}
