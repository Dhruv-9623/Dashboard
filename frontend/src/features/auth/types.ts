export enum UserType {
  VC = 'VC',
  STARTUP = 'STARTUP',
}

export interface UserDTO {
  id: string
  email: string
  userType: UserType | null
  isActive: boolean
  accountSetupComplete: boolean
}

export interface AccountTypeSelectionRequest {
  userType: UserType
}
