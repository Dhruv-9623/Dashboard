const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

/** Requests that hang longer than this surface as an error instead of an endless skeleton. */
const REQUEST_TIMEOUT_MS = 30_000

interface ApiResponse<T> {
  success: boolean
  data?: T
  errorCode?: string
  message?: string
  /** Per-field messages on VALIDATION_ERROR, keyed by request field name. */
  fieldErrors?: Record<string, string>
  timestamp?: string
}

enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  DUPLICATE_OWNER = 'DUPLICATE_OWNER',
  POOL_ENTRY_CONFLICT = 'POOL_ENTRY_CONFLICT',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  // Client-side only: the request never got a response.
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
}

class ApiError extends Error {
  constructor(
    public errorCode: string,
    message: string,
    public status: number,
    public fieldErrors: Record<string, string> = {}
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Paged list contract (backend `common/PageResponse`). `page` is zero-based. */
interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

interface PageParams {
  page?: number
  size?: number
}

/** Builds `path?key=value…`, skipping undefined, null, empty and `false` values. */
function withQuery(path: string, params: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue
    query.set(key, String(value))
  }
  const encoded = query.toString()
  return encoded ? `${path}?${encoded}` : path
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/** Spring Security's SPA CSRF mode issues XSRF-TOKEN as a readable cookie and expects it echoed back. */
function csrfHeader(method: string): Record<string, string> {
  if (SAFE_METHODS.has(method.toUpperCase())) return {}
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? { 'X-XSRF-TOKEN': decodeURIComponent(match[1]) } : {}
}

async function send(endpoint: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${endpoint}`, {
      ...init,
      credentials: 'include',
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(ErrorCode.TIMEOUT, 'The server took too long to respond. Please try again.', 0)
    }
    throw new ApiError(
      ErrorCode.NETWORK_ERROR,
      "Can't reach the server. Check your connection and try again.",
      0
    )
  }
}

async function readEnvelope<T>(response: Response): Promise<T> {
  // 204s and empty bodies are valid for DELETE-style endpoints.
  const raw = await response.text()

  if (!raw) {
    if (!response.ok) {
      throw new ApiError(ErrorCode.INTERNAL_ERROR, `HTTP ${response.status}`, response.status)
    }
    return null as T
  }

  let data: ApiResponse<T>
  try {
    data = JSON.parse(raw)
  } catch {
    throw new ApiError(
      ErrorCode.INTERNAL_ERROR,
      response.ok ? 'Malformed response from server' : `HTTP ${response.status}`,
      response.status
    )
  }

  if (!data.success || !response.ok) {
    throw new ApiError(
      data.errorCode || ErrorCode.INTERNAL_ERROR,
      data.message || `HTTP ${response.status}`,
      response.status,
      data.fieldErrors ?? {}
    )
  }

  // The backend omits null fields (@JsonInclude NON_NULL), so "no data" arrives as a missing key.
  // React Query rejects `undefined` query results, so normalise it to null.
  return (data.data === undefined ? null : data.data) as T
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = options.method ?? 'GET'
  const response = await send(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeader(method),
      ...options.headers,
    },
  })

  return readEnvelope<T>(response)
}

async function uploadApi<T>(endpoint: string, file: File, fieldName = 'file'): Promise<T> {
  const body = new FormData()
  body.append(fieldName, file)

  // No Content-Type header — the browser sets the multipart boundary.
  const response = await send(endpoint, {
    method: 'POST',
    headers: csrfHeader('POST'),
    body,
  })

  return readEnvelope<T>(response)
}

export { fetchApi, uploadApi, withQuery, ApiError, API_BASE }
export type { PageResponse, PageParams }
