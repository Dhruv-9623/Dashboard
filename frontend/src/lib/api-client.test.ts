import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, fetchApi, withQuery } from './api-client'

/** Builds a Response the way the backend's ApiResponse envelope actually looks on the wire. */
const envelope = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

/** Stubs fetch and records what the client sent, without fighting fetch's overloaded types. */
const mockFetch = (response: Response | (() => Promise<Response>)) => {
  const calls: RequestInit[] = []
  vi.stubGlobal('fetch', (_input: unknown, init: RequestInit) => {
    calls.push(init)
    return typeof response === 'function' ? response() : Promise.resolve(response)
  })
  return {
    headersOfFirstCall: () => (calls[0].headers ?? {}) as Record<string, string>,
    firstCall: () => calls[0],
  }
}

/** Awaits a request that must fail, and hands back the ApiError it threw. */
const failureOf = async (request: Promise<unknown>): Promise<ApiError> => {
  try {
    await request
  } catch (error) {
    if (error instanceof ApiError) return error
    throw error
  }
  throw new Error('expected the request to fail, but it succeeded')
}

describe('fetchApi', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('unwraps the data field of a successful envelope', async () => {
    mockFetch(envelope({ success: true, data: { id: 'ai-circle.html', name: 'Meridian' } }))

    await expect(fetchApi('/api/vc/firms/me')).resolves.toEqual({ id: 'ai-circle.html', name: 'Meridian' })
  })

  it('turns a missing data field into null rather than undefined', async () => {
    // The backend serialises with NON_NULL, so "you have no firm yet" arrives as an absent key.
    // React Query throws on an undefined query result, and this broke the onboarding guard live.
    mockFetch(envelope({ success: true }))

    await expect(fetchApi('/api/vc/firms/me')).resolves.toBeNull()
  })

  it('accepts an empty body', async () => {
    mockFetch(new Response(null, { status: 204 }))

    await expect(fetchApi('/api/investments/1', { method: 'DELETE' })).resolves.toBeNull()
  })

  it('raises an ApiError carrying the error code, status and field errors', async () => {
    mockFetch(
      envelope(
        {
          success: false,
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          fieldErrors: { amount: 'Amount must be positive' },
        },
        400
      )
    )

    const error = await failureOf(fetchApi('/api/investments', { method: 'POST' }))

    expect(error.errorCode).toBe('VALIDATION_ERROR')
    expect(error.status).toBe(400)
    expect(error.fieldErrors).toEqual({ amount: 'Amount must be positive' })
  })

  it('defaults fieldErrors to an empty object so callers can index it freely', async () => {
    mockFetch(envelope({ success: false, errorCode: 'UNAUTHORIZED', message: 'No' }, 401))

    const error = await failureOf(fetchApi('/api/vc/firms'))

    expect(error.fieldErrors).toEqual({})
  })

  it('reports an error for a failed status even when the body claims success', async () => {
    mockFetch(envelope({ success: true, data: null }, 500))

    await expect(fetchApi('/api/vc/firms')).rejects.toBeInstanceOf(ApiError)
  })

  it('explains an unreachable server in plain language instead of leaking "Failed to fetch"', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')))

    const error = await failureOf(fetchApi('/api/vc/firms'))

    expect(error.errorCode).toBe('NETWORK_ERROR')
    expect(error.message).toMatch(/can't reach the server/i)
    expect(error.status).toBe(0)
  })

  it('reports a timeout separately from a network failure', async () => {
    mockFetch(() => Promise.reject(new DOMException('The operation timed out', 'TimeoutError')))

    const error = await failureOf(fetchApi('/api/vc/firms'))

    expect(error.errorCode).toBe('TIMEOUT')
    expect(error.message).toMatch(/too long/i)
  })

  it('survives a non-JSON body, such as a proxy error page', async () => {
    mockFetch(new Response('<html>502 Bad Gateway</html>', { status: 502 }))

    const error = await failureOf(fetchApi('/api/vc/firms'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(502)
  })
})

describe('CSRF', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    document.cookie = 'XSRF-TOKEN=token%2Fvalue; path=/'
  })

  it('echoes the XSRF-TOKEN cookie on unsafe methods, URL-decoded', async () => {
    const fetchMock = mockFetch(envelope({ success: true, data: null }))

    await fetchApi('/api/investments', { method: 'POST', body: '{}' })

    expect(fetchMock.headersOfFirstCall()['X-XSRF-TOKEN']).toBe('token/value')
  })

  it('does not send the header on GET', async () => {
    const fetchMock = mockFetch(envelope({ success: true, data: [] }))

    await fetchApi('/api/investments')

    expect(fetchMock.headersOfFirstCall()['X-XSRF-TOKEN']).toBeUndefined()
  })

  it('sends cookies, without which the session is never established', async () => {
    const fetchMock = mockFetch(envelope({ success: true, data: null }))

    await fetchApi('/api/auth/me')

    expect(fetchMock.firstCall().credentials).toBe('include')
  })
})

describe('withQuery', () => {
  it('leaves a path alone when nothing is set', () => {
    expect(withQuery('/api/investments', { page: undefined, search: '' })).toBe('/api/investments')
  })

  it('keeps page 0 and drops empty, null and false values', () => {
    expect(withQuery('/api/investments', { page: 0, size: 20, status: '', sector: null, mine: false }))
      .toBe('/api/investments?page=0&size=20')
  })

  it('encodes values that would otherwise break the query string', () => {
    expect(withQuery('/api/startups', { search: 'A&B co' })).toBe('/api/startups?search=A%26B+co')
  })
})
