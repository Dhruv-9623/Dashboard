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
  /** Null once the member who added it has left the firm. */
  addedByEmail: string | null
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

/**
 * Interest is an intensity, not a status, so it climbs one scale:
 * neutral → outlined brand → filled brand. It deliberately avoids amber, which
 * this product uses for "something needs attention" and which read as a warning
 * next to a real one.
 */
export const interestLevelVariants: Record<
  InterestLevel,
  'secondary' | 'outline' | 'default'
> = {
  [InterestLevel.WATCHING]: 'secondary',
  [InterestLevel.INTERESTED]: 'outline',
  [InterestLevel.HIGH_PRIORITY]: 'default',
}
