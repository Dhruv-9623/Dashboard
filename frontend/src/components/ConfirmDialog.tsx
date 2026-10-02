import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { errorMessage } from '@/components/ErrorState'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: string
  /** Label for the destructive button, e.g. "Remove". */
  confirmLabel: string
  pendingLabel?: string
  isPending?: boolean
  /** Shown in place of the body text when the action failed. */
  error?: unknown
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

/** Confirmation for destructive actions that can't be undone. */
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel = 'Working…',
  isPending = false,
  error,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    description={description}
    footer={
      <>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button
          className="bg-negative hover:bg-negative focus-visible:ring-negative"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </>
    }
  >
    {error ? (
      <Alert variant="danger">{errorMessage(error)}</Alert>
    ) : (
      (children ?? <p className="text-sm text-ink-secondary">This cannot be undone.</p>)
    )}
  </Modal>
)
