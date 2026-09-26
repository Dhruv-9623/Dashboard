import { describe, expect, it } from 'vitest'
import { ApiError } from './api-client'
import { useFieldErrors } from './useFieldErrors'

const validationError = (fieldErrors: Record<string, string>) =>
  new ApiError('VALIDATION_ERROR', 'Validation failed', 400, fieldErrors)

const fallback = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')

describe('useFieldErrors', () => {
  it('returns the message for a field that failed', () => {
    const fields = useFieldErrors(validationError({ amount: 'Amount must be positive' }))

    expect(fields.message('amount')).toBe('Amount must be positive')
    expect(fields.message('currency')).toBeUndefined()
    expect(fields.hasFieldErrors).toBe(true)
  })

  it('wires the input up for screen readers only while it is invalid', () => {
    const fields = useFieldErrors(validationError({ amount: 'Amount must be positive' }))

    expect(fields.a11y('amount', 'inv-amount')).toEqual({
      'aria-invalid': true,
      'aria-describedby': 'inv-amount-error',
    })
    expect(fields.a11y('currency', 'inv-currency')).toEqual({})
  })

  it('falls back to the generic message when the error has no field detail', () => {
    const fields = useFieldErrors(new ApiError('INTERNAL_ERROR', 'Server exploded', 500))

    expect(fields.hasFieldErrors).toBe(false)
    expect(fields.summary(fallback)).toBe('Server exploded')
  })

  it('handles a non-ApiError, such as a thrown string', () => {
    const fields = useFieldErrors('boom')

    expect(fields.errors).toEqual({})
    expect(fields.summary(fallback)).toBe('Something went wrong')
  })

  it('points at the fields when every message is already shown inline', () => {
    const fields = useFieldErrors(validationError({ amount: 'Amount must be positive' }))
    fields.message('amount')

    expect(fields.summary(fallback)).toBe('Please fix the highlighted fields.')
  })

  it('spells out a message for a field the form does not render', () => {
    // Regression: the summary used to say "Please fix the highlighted fields" even when nothing
    // was highlighted, so a server rule on an unwired field (notes over 5000 characters) left the
    // user staring at a form with no visible problem.
    const fields = useFieldErrors(validationError({ notes: 'Notes must be at most 5000 characters' }))
    fields.message('amount')

    expect(fields.summary(fallback)).toBe('Notes must be at most 5000 characters')
  })

  it('lists every unshown message, not just the first', () => {
    const fields = useFieldErrors(validationError({ notes: 'Notes too long', round: 'Unknown round' }))

    expect(fields.summary(fallback)).toBe('Notes too long Unknown round')
  })
})
