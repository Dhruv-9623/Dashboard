import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { messagingApi } from './api'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Label, FieldHint } from '@/components/ui/Label'
import { Alert } from '@/components/ui/Alert'
import { MessageIcon } from '@/components/icons'
import { errorMessage } from '@/components/ErrorState'

interface ConnectButtonProps {
  targetType: 'VC_FIRM' | 'STARTUP'
  targetId: string
  targetName: string
}

export const ConnectButton = ({ targetType, targetId, targetName }: ConnectButtonProps) => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      messagingApi.requestConnection({
        targetType,
        targetId,
        message: message.trim() || undefined,
      }),
  })

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <MessageIcon className="mr-2 h-4 w-4" />
        Request connection
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Connect with ${targetName}`}
        description="Messaging unlocks only once both sides accept."
        footer={
          mutation.isSuccess ? (
            <Button onClick={() => setOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? 'Sending…' : 'Send request'}
              </Button>
            </>
          )
        }
      >
        {mutation.isSuccess ? (
          <Alert variant="success" title="Request sent">
            You'll be able to message {targetName} as soon as they accept.
          </Alert>
        ) : (
          <>
            <Label htmlFor="connect-message">Intro message</Label>
            <Textarea
              id="connect-message"
              rows={4}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Why you'd like to connect."
            />
            <FieldHint>Optional, but a short note meaningfully raises acceptance rates.</FieldHint>
            {mutation.isError && (
              <Alert variant="danger" className="mt-3">
                {errorMessage(mutation.error)}
              </Alert>
            )}
          </>
        )}
      </Modal>
    </>
  )
}
