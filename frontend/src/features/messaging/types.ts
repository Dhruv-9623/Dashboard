export enum ConnectionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

/** Who the other side of a connection or conversation is. */
export interface CounterpartyDTO {
  userId: string
  email: string
  displayName: string
  /** VC_FIRM or STARTUP, with the entity they belong to. */
  entityType: 'VC_FIRM' | 'STARTUP'
  entityId: string | null
  entityName: string | null
  logoUrl: string | null
}

export interface ConnectionRequestDTO {
  id: string
  from: CounterpartyDTO
  to: CounterpartyDTO
  status: ConnectionStatus
  message: string | null
  requestedAt: string
  respondedAt: string | null
}

export interface ConversationDTO {
  id: string
  counterparty: CounterpartyDTO
  lastMessagePreview: string | null
  lastMessageAt: string | null
  unreadCount: number
  createdAt: string
}

export interface MessageDTO {
  id: string
  conversationId: string
  senderUserId: string
  senderEmail: string
  body: string
  sentAt: string
  readAt: string | null
}

/** Addressed to an entity — the backend resolves it to that entity's owner user. */
export interface CreateConnectionRequest {
  targetType: 'VC_FIRM' | 'STARTUP'
  targetId: string
  message?: string
}

export const connectionStatusLabels: Record<ConnectionStatus, string> = {
  [ConnectionStatus.PENDING]: 'Pending',
  [ConnectionStatus.ACCEPTED]: 'Connected',
  [ConnectionStatus.REJECTED]: 'Declined',
}

export const connectionStatusVariants: Record<
  ConnectionStatus,
  'warning' | 'success' | 'danger'
> = {
  [ConnectionStatus.PENDING]: 'warning',
  [ConnectionStatus.ACCEPTED]: 'success',
  [ConnectionStatus.REJECTED]: 'danger',
}
