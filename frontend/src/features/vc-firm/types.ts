export enum VCRole {
  OWNER = 'OWNER',
  PORTFOLIO_MANAGER = 'PORTFOLIO_MANAGER',
  STAFF = 'STAFF',
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
  createdAt: string
  updatedAt: string
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
