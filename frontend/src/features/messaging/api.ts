import { fetchApi } from '@/lib/api-client'
import type {
  ConnectionRequestDTO,
  ConnectionStatus,
  ConversationDTO,
  CreateConnectionRequest,
  MessageDTO,
} from './types'

export const messagingApi = {
  listConnections: (direction: 'incoming' | 'outgoing') =>
    fetchApi<ConnectionRequestDTO[]>(`/api/connection-requests?direction=${direction}`),

  requestConnection: (request: CreateConnectionRequest) =>
    fetchApi<ConnectionRequestDTO>('/api/connection-requests', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  respondToConnection: (id: string, status: ConnectionStatus) =>
    fetchApi<ConnectionRequestDTO>(`/api/connection-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  listConversations: () => fetchApi<ConversationDTO[]>('/api/conversations'),

  listMessages: (conversationId: string) =>
    fetchApi<MessageDTO[]>(`/api/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, body: string) =>
    fetchApi<MessageDTO>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  markRead: (conversationId: string) =>
    fetchApi<void>(`/api/conversations/${conversationId}/read`, { method: 'POST' }),
}

export const messagingKeys = {
  connections: (direction: 'incoming' | 'outgoing') =>
    ['connection-requests', direction] as const,
  conversations: ['conversations'] as const,
  messages: (id: string) => ['conversations', id, 'messages'] as const,
}
