import { describe, expect, it } from 'vitest'
import { errorMessage } from './errorMessage'
import { ApiError } from './api-client'

describe('errorMessage', () => {
  it('shows a 4xx message as written, because the backend wrote it for the user', () => {
    const error = new ApiError(
      'BUSINESS_RULE_VIOLATION',
      'A round is already open for this startup.',
      409
    )
    expect(errorMessage(error)).toBe('A round is already open for this startup.')
  })

  it('keeps a 403 explanation, which is the most useful thing we can say', () => {
    const error = new ApiError('UNAUTHORIZED', 'Only a founder can open a funding round.', 403)
    expect(errorMessage(error)).toBe('Only a founder can open a funding round.')
  })

  it('replaces a 5xx message, which is written for us and can leak schema detail', () => {
    const leaky = new ApiError(
      'INTERNAL_ERROR',
      'could not execute statement; constraint [uq_commitment_cycle_firm]',
      500
    )
    expect(errorMessage(leaky)).toBe('Something went wrong on our end. Please try again.')
    expect(errorMessage(leaky)).not.toContain('uq_commitment_cycle_firm')
  })

  it('replaces the bare "HTTP 500" that an empty error body produces', () => {
    expect(errorMessage(new ApiError('INTERNAL_ERROR', 'HTTP 503', 503))).not.toMatch(/HTTP/)
  })

  it('tells the user to sign in again on a 401 rather than echoing the server', () => {
    expect(errorMessage(new ApiError('UNAUTHORIZED', 'Full authentication is required', 401))).toBe(
      'Your session has ended. Sign in again to continue.'
    )
  })

  it('falls back to plain language on a 404 with no message', () => {
    expect(errorMessage(new ApiError('ENTITY_NOT_FOUND', '', 404))).toBe(
      "That part of the app isn't available right now."
    )
  })

  it('never shows a 404 body that names a route', () => {
    // These reached the screen verbatim, publishing an internal id with them.
    expect(
      errorMessage(new ApiError('ENTITY_NOT_FOUND', 'No endpoint at /api/vc/firms/e85dec0d/thesis', 404))
    ).toBe("That part of the app isn't available right now.")
    expect(errorMessage(new ApiError('ENTITY_NOT_FOUND', 'No endpoint at /api/insights', 404))).toBe(
      "That part of the app isn't available right now."
    )
  })

  it('still shows a 404 written for a person', () => {
    expect(errorMessage(new ApiError('ENTITY_NOT_FOUND', 'That round has been deleted.', 404))).toBe(
      'That round has been deleted.'
    )
  })

  it('turns a browser network TypeError into something actionable', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toMatch(/Check your connection/)
  })

  it('keeps the api-client message for a client-side timeout (status 0)', () => {
    const timeout = new ApiError('TIMEOUT', 'The server took too long to respond. Please try again.', 0)
    expect(errorMessage(timeout)).toBe('The server took too long to respond. Please try again.')
  })

  it('uses the fallback for a non-Error value', () => {
    expect(errorMessage(undefined, 'Could not save.')).toBe('Could not save.')
  })
})
