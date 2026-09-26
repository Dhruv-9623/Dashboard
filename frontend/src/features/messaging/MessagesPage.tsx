import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { messagingApi, messagingKeys } from './api'
import { ConnectionStatus, connectionStatusLabels, connectionStatusVariants } from './types'
import type { ConversationDTO } from './types'
import { useAuth } from '@/features/auth/useAuth'
import { PageHeader } from '@/components/PageHeader'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Tabs'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { CheckIcon, MessageIcon, SendIcon, XIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/constants'

const ConnectionRequests = () => {
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming')
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: messagingKeys.connections(direction),
    queryFn: () => messagingApi.listConnections(direction),
  })

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ConnectionStatus }) =>
      messagingApi.respondToConnection(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connection-requests'] })
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations })
    },
  })

  const requests = query.data ?? []

  return (
    <>
      <Tabs
        className="mb-4"
        value={direction}
        onChange={(value) => setDirection(value as 'incoming' | 'outgoing')}
        items={[
          { value: 'incoming', label: 'Received' },
          { value: 'outgoing', label: 'Sent' },
        ]}
      />

      {query.isLoading ? (
        <SkeletonRows rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<MessageIcon className="h-6 w-6" />}
          title={direction === 'incoming' ? 'No requests received' : 'No requests sent'}
          description="Chat unlocks only after both sides opt in, so requests appear here first."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const other = direction === 'incoming' ? request.from : request.to

            return (
              <Card key={request.id}>
                <CardContent className="flex flex-wrap items-start gap-4 py-4">
                  <Avatar name={other.displayName} logoUrl={other.logoUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{other.displayName}</span>
                      {other.entityName && (
                        <span className="text-sm text-ink-muted">· {other.entityName}</span>
                      )}
                      <Badge variant={connectionStatusVariants[request.status]}>
                        {connectionStatusLabels[request.status]}
                      </Badge>
                    </div>
                    {request.message && (
                      <p className="mt-1.5 text-sm text-ink-secondary">{request.message}</p>
                    )}
                    <p className="mt-1 text-xs text-ink-muted">
                      {formatDateTime(request.requestedAt)}
                    </p>
                  </div>

                  {direction === 'incoming' && request.status === ConnectionStatus.PENDING && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          respond.mutate({ id: request.id, status: ConnectionStatus.ACCEPTED })
                        }
                        disabled={respond.isPending}
                      >
                        <CheckIcon className="mr-1.5 h-4 w-4" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          respond.mutate({ id: request.id, status: ConnectionStatus.REJECTED })
                        }
                        disabled={respond.isPending}
                      >
                        <XIcon className="mr-1.5 h-4 w-4" />
                        Decline
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}

const Thread = ({ conversation }: { conversation: ConversationDTO }) => {
  const [draft, setDraft] = useState('')
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  const query = useQuery({
    queryKey: messagingKeys.messages(conversation.id),
    queryFn: () => messagingApi.listMessages(conversation.id),
    refetchInterval: 10000,
  })

  const send = useMutation({
    mutationFn: (body: string) => messagingApi.sendMessage(conversation.id, body),
    onSuccess: () => {
      setDraft('')
      queryClient.invalidateQueries({ queryKey: messagingKeys.messages(conversation.id) })
      queryClient.invalidateQueries({ queryKey: messagingKeys.conversations })
    },
  })

  const messages = query.data ?? []
  const hasUnread = conversation.unreadCount > 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  // Opening a thread clears its unread badge.
  useEffect(() => {
    if (!hasUnread || !query.isSuccess) return
    messagingApi
      .markRead(conversation.id)
      .then(() => queryClient.invalidateQueries({ queryKey: messagingKeys.conversations }))
      .catch(() => {
        // Non-critical: the badge simply stays until the next successful attempt.
      })
  }, [conversation.id, hasUnread, query.isSuccess, queryClient])

  return (
    <Card className="flex h-[32rem] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <Avatar name={conversation.counterparty.displayName} logoUrl={conversation.counterparty.logoUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {conversation.counterparty.displayName}
          </p>
          {conversation.counterparty.entityName && (
            <p className="truncate text-xs text-ink-muted">
              {conversation.counterparty.entityName}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {query.isLoading ? (
          <SkeletonRows rows={3} />
        ) : query.isError ? (
          <ErrorState
            title="Couldn't load this conversation"
            error={query.error}
            onRetry={() => query.refetch()}
          />
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((message) => {
            const mine = message.senderUserId === user?.id

            return (
              <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3.5 py-2',
                    mine ? 'bg-brand text-white' : 'bg-surface-hover text-ink'
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                  <p className={cn('mt-1 text-xs', mine ? 'text-[color-mix(in_oklab,white_82%,var(--brand))]' : 'text-ink-secondary')}>
                    {formatDateTime(message.sentAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {send.isError && (
        <p role="alert" className="border-t border-[color-mix(in_oklab,var(--negative)_25%,transparent)] bg-negative-subtle px-5 py-2 text-sm text-negative">
          Message not sent: {errorMessage(send.error)}
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (draft.trim()) send.mutate(draft.trim())
        }}
        className="flex gap-2 border-t border-line px-5 py-3"
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message…"
          aria-label={`Message ${conversation.counterparty.displayName}`}
        />
        <Button type="submit" aria-label="Send message" disabled={!draft.trim() || send.isPending}>
          <SendIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </Card>
  )
}

const Conversations = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: messagingKeys.conversations,
    queryFn: messagingApi.listConversations,
  })

  const conversations = query.data ?? []
  const selected = conversations.find((c) => c.id === selectedId) ?? conversations[0] ?? null

  if (query.isLoading) return <SkeletonRows rows={4} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />

  if (conversations.length === 0) {
    return (
      <EmptyState
        icon={<MessageIcon className="h-6 w-6" />}
        title="No conversations yet"
        description="A conversation opens automatically once a connection request is accepted by both sides."
      />
    )
  }

  return (
    // grid-cols-1 = minmax(0,1fr): without it the implicit column grows to the widest message and
    // pushes the page wider than a phone screen.
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardContent className="py-3">
          <ul className="space-y-1">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(conversation.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors',
                    selected?.id === conversation.id ? 'bg-brand-subtle' : 'hover:bg-surface-sunken'
                  )}
                >
                  <Avatar
                    name={conversation.counterparty.displayName}
                    logoUrl={conversation.counterparty.logoUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {conversation.counterparty.displayName}
                    </p>
                    {conversation.lastMessagePreview && (
                      <p className="truncate text-xs text-ink-secondary">
                        {conversation.lastMessagePreview}
                      </p>
                    )}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge>{conversation.unreadCount}</Badge>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {selected && <Thread conversation={selected} />}
    </div>
  )
}

export const MessagesPage = () => {
  const [tab, setTab] = useState('conversations')

  const pending = useQuery({
    queryKey: messagingKeys.connections('incoming'),
    queryFn: () => messagingApi.listConnections('incoming'),
  })

  const pendingCount = (pending.data ?? []).filter(
    (request) => request.status === ConnectionStatus.PENDING
  ).length

  return (
    <>
      <PageHeader
        title="Messages"
        description="Chat unlocks only after both sides accept the connection."
      />

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'conversations', label: 'Conversations' },
          { value: 'requests', label: 'Requests', count: pendingCount },
        ]}
      />

      {tab === 'conversations' ? <Conversations /> : <ConnectionRequests />}
    </>
  )
}
