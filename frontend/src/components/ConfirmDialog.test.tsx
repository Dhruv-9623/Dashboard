import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from './ConfirmDialog'
import { ApiError } from '@/lib/api-client'

const props = {
  open: true,
  title: 'Remove this investment?',
  confirmLabel: 'Remove',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

describe('ConfirmDialog', () => {
  it('says the action is irreversible when the caller gives no body text', () => {
    render(<ConfirmDialog {...props} />)

    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('only removes when the destructive button is pressed', async () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmDialog {...props} onConfirm={onConfirm} onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('cannot be double-submitted while the request is in flight', () => {
    render(<ConfirmDialog {...props} isPending pendingLabel="Removing…" />)

    expect(screen.getByRole('button', { name: 'Removing…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('stays open and shows why when the server refuses', () => {
    render(
      <ConfirmDialog
        {...props}
        error={new ApiError('BUSINESS_RULE_VIOLATION', 'This member still owns pool entries', 409)}
      />
    )

    expect(screen.getByText('This member still owns pool entries')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove' })).toBeEnabled()
  })

  it('renders nothing when closed', () => {
    render(<ConfirmDialog {...props} open={false} />)

    expect(screen.queryByText('Remove this investment?')).not.toBeInTheDocument()
  })
})
