export enum WishlistTargetType {
  VC_FIRM = 'VC_FIRM',
  STARTUP = 'STARTUP',
}

export interface WishlistItemDTO {
  id: string
  targetType: WishlistTargetType
  targetId: string
  targetName: string
  targetSector: string | null
  targetStage: string | null
  targetLogoUrl: string | null
  note: string | null
  savedAt: string
}

export interface CreateWishlistItemRequest {
  targetType: WishlistTargetType
  targetId: string
  note?: string
}
