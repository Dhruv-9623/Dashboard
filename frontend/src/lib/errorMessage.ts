import { ApiError } from './api-client'

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again."
const SERVER_MESSAGE = 'Something went wrong on our end. Please try again.'

/**
 * The one place that decides what a user is told about a failure.
 *
 * The rule is about who wrote the text. A 4xx body is written for the person
 * reading it — "A round is already open for this startup", "Only a founder can
 * open a funding round" — and it is the most useful thing we can say, so it is
 * shown as-is. A 5xx body is written for us: a constraint name, an exception
 * message, a bare "HTTP 500". It means nothing to a VC, and it can leak schema
 * detail, so it is replaced.
 */
export const errorMessage = (error: unknown, fallback = 'Something went wrong.') => {
  // Browsers report network failures as a bare "Failed to fetch" / "Load failed" TypeError.
  if (error instanceof TypeError && /fetch|load failed|network/i.test(error.message)) {
    return NETWORK_MESSAGE
  }

  if (error instanceof ApiError) {
    if (error.status >= 500) return SERVER_MESSAGE
    if (error.status === 401) return 'Your session has ended. Sign in again to continue.'
    if (error.status === 404) return error.message || 'That item no longer exists.'
    // status 0 is the client-side network/timeout case, which already carries a
    // written-for-humans message from api-client.
    return error.message || fallback
  }

  return error instanceof Error && error.message ? error.message : fallback
}
