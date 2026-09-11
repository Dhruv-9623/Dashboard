import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { outreachApi, outreachKeys } from './api'
import { outreachStatusLabels, outreachStatusVariants } from './types'
import { startupApi } from '@/features/startup/api'
import type { StartupDTO } from '@/features/startup/types'
import { StartupPicker } from '@/components/StartupPicker'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState, errorMessage } from '@/components/ErrorState'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Label, FieldHint } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { SkeletonRows } from '@/components/ui/Skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { MailIcon } from '@/components/icons'
import { formatDate } from '@/lib/constants'

const ComposeModal = ({
  initialStartup,
  onClose,
}: {
  initialStartup: StartupDTO | null
  onClose: () => void
}) => {
  const [startup, setStartup] = useState<StartupDTO | null>(initialStartup)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: () =>
      outreachApi.send({
        toStartupId: startup?.id ?? '',
        subject: subject.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: outreachKeys.all })
      onClose()
    },
  })

  const ready = Boolean(startup && subject.trim() && body.trim())

  return (
    <Modal
      open
      onClose={onClose}
      title="New outreach"
      description="A direct message to a startup you're not connected with yet."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button form="outreach-form" type="submit" disabled={!ready || mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Send'}
          </Button>
        </>
      }
    >
      <form
        id="outreach-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (ready) mutation.mutate()
        }}
        className="space-y-4"
      >
        <div>
          <Label required>To</Label>
          <StartupPicker value={startup} onChange={setStartup} />
        </div>

        <div>
          <Label htmlFor="outreach-subject" required>
            Subject
          </Label>
          <Input
            id="outreach-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="outreach-body" required>
            Message
          </Label>
          <Textarea
            id="outreach-body"
            rows={6}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
          <FieldHint>
            Outreach bypasses mutual consent, so keep it specific and easy to reply to.
          </FieldHint>
        </div>

        {mutation.isError && <Alert variant="danger">{errorMessage(mutation.error)}</Alert>}
      </form>
    </Modal>
  )
}

export const OutreachPage = () => {
  const [params, setParams] = useSearchParams()
  const [composeOpen, setComposeOpen] = useState(false)
  const [prefill, setPrefill] = useState<StartupDTO | null>(null)
  const startupId = params.get('startupId')

  const query = useQuery({ queryKey: outreachKeys.all, queryFn: outreachApi.list })

  const prefillQuery = useQuery({
    queryKey: ['startups', 'detail', startupId],
    queryFn: () => startupApi.get(startupId as string),
    enabled: Boolean(startupId),
  })

  useEffect(() => {
    if (prefillQuery.data) {
      setPrefill(prefillQuery.data)
      setComposeOpen(true)
      params.delete('startupId')
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillQuery.data])

  const messages = query.data ?? []

  return (
    <>
      <PageHeader
        title="Outreach"
        description="Direct messages your firm has sent to startups outside the mutual-consent flow."
        actions={
          <Button
            onClick={() => {
              setPrefill(null)
              setComposeOpen(true)
            }}
          >
            <MailIcon className="mr-2 h-4 w-4" />
            New outreach
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonRows />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : messages.length === 0 ? (
        <EmptyState
          icon={<MailIcon className="h-6 w-6" />}
          title="No outreach sent"
          description="Reach out to a startup that hasn't connected with your firm yet."
          action={
            <Button
              onClick={() => {
                setPrefill(null)
                setComposeOpen(true)
              }}
            >
              <MailIcon className="mr-2 h-4 w-4" />
              New outreach
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <tr>
                <TableHead>To</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Status</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="font-medium text-gray-900">
                    {message.toStartupName}
                  </TableCell>
                  <TableCell>
                    <span className="text-gray-900">{message.subject}</span>
                    <span className="mt-0.5 block max-w-md truncate text-xs text-gray-500">
                      {message.body}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDate(message.sentAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={outreachStatusVariants[message.status]}>
                      {outreachStatusLabels[message.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {composeOpen && (
        <ComposeModal initialStartup={prefill} onClose={() => setComposeOpen(false)} />
      )}
    </>
  )
}
