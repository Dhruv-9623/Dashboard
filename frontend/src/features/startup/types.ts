export enum StartupRole {
  FOUNDER = 'FOUNDER',
  CO_FOUNDER = 'CO_FOUNDER',
}

export interface StartupDTO {
  id: string
  name: string
  description: string | null
  website: string | null
  logoUrl: string | null
  sector: string
  stage: string
  location: string | null
  foundedYear: number | null
  annualRevenue: number | null
  teamSize: number | null
  pitchDeckUrl: string | null
  isRaising: boolean
  createdAt: string
  updatedAt: string
}

export interface StartupMemberDTO {
  id: string
  userId: string
  userEmail: string
  startupId: string
  role: StartupRole
  joinedAt: string
}

export interface UpsertStartupRequest {
  name: string
  description?: string
  website?: string
  logoUrl?: string
  sector: string
  stage: string
  location?: string
  foundedYear?: number
  annualRevenue?: number
  teamSize?: number
  pitchDeckUrl?: string
}

export interface StartupSearchParams {
  search?: string
  sector?: string
  stage?: string
  raisingOnly?: boolean
}

export const startupRoleLabels: Record<StartupRole, string> = {
  [StartupRole.FOUNDER]: 'Founder',
  [StartupRole.CO_FOUNDER]: 'Co-founder',
}
