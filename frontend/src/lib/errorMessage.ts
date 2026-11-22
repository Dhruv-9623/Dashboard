import { ApiError } from './api-client'

const NETWORK_MESSAGE = "Can't reach the server. Check your connection and try again."
const SERVER_MESSAGE = 'Something went wrong on our end. Please try again.'
const MISSING_MESSAGE = "That part of the app isn't available right now."

/**
 * Whether a message is really a route diagnostic — "No endpoint at /api/…", a bare path, or any
 * text with an `/api/` segment in it. Those are written for us and may embed record ids.
 */
const looksLikeRoute = (message: string) =>
  /\/api\//.test(message) || /^no endpoint\b/i.test(message.trim())

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
    // A 404 body that names a route is a diagnostic, not a sentence for a user, and the path can
    // carry an internal id. Those are replaced; a written-for-humans 404 still shows as-is.
    if (error.status === 404) {
      return looksLikeRoute(error.message) ? MISSING_MESSAGE : error.message || MISSING_MESSAGE
    }
    // status 0 is the client-side network/timeout case, which already carries a
    // written-for-humans message from api-client.
    return error.message || fallback
  }

  return error instanceof Error && error.message ? error.message : fallback
}

/**
 * What to tell someone whose *action* failed — sending a request, saving a form.
 *
 * Business rules still come through in the server's own words, because they are the useful part
 * and they tell the user what to do differently: "You've already sent a request to this firm."
 * Everything else — a missing endpoint, a 500, a dropped connection — becomes the caller's own
 * sentence about the action, rather than a diagnostic the user can do nothing with.
 */
export const actionError = (error: unknown, fallback: string) => {
  const generic =
    errorMessage(error) === NETWORK_MESSAGE
    || errorMessage(error) === SERVER_MESSAGE
    || errorMessage(error) === MISSING_MESSAGE
  return generic ? fallback : errorMessage(error, fallback)
}
