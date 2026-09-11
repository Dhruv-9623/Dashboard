export enum VCRole {
  OWNER = 'OWNER',
  PORTFOLIO_MANAGER = 'PORTFOLIO_MANAGER',
  STAFF = 'STAFF',
}

export enum PlanTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
}

/** The firm's investment thesis — what Deal Triage scores opportunities against. */
export interface ThesisDTO {
  sectors: string[]
  stages: string[]
  chequeSizeMin: number | null
  chequeSizeMax: number | null
  currency: string
  notes: string | null
  updatedAt: string
}

export interface VCFirmDTO {
  id: string
  name: string
  description?: string
  website?: string
  aum?: number
  investmentStage?: string
  sectors?: string[]
  location?: string
  foundedYear?: number
  planTier: PlanTier
  thesis: ThesisDTO | null
  createdAt: string
  updatedAt: string
}

export interface UpdateThesisRequest {
  sectors: string[]
  stages: string[]
  chequeSizeMin: number | null
  chequeSizeMax: number | null
  currency: string
  notes?: string
}

export interface VCMemberDTO {
  id: string
  userId: string
  userEmail: string
  firmId: string
  role: VCRole
  joinedAt: string
  createdAt: string
  updatedAt: string
}

export interface CreateVCFirmRequest {
  name: string
  description?: string
  website?: string
  aum?: number
  investmentStage?: string
  sectors?: string[]
  location?: string
  foundedYear?: number
}

export interface UpdateVCFirmRequest {
  name?: string
  description?: string
  website?: string
  aum?: number
  investmentStage?: string
  sectors?: string[]
  location?: string
  foundedYear?: number
}

export interface AddMemberRequest {
  userId: string
}
