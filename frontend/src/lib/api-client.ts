const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

interface ApiResponse<T> {
  success: boolean
  data?: T
  errorCode?: string
  message?: string
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
}

class ApiError extends Error {
  constructor(
    public errorCode: string,
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function readEnvelope<T>(response: Response): Promise<T> {
  // 204s and empty bodies are valid for DELETE-style endpoints.
  const raw = await response.text()

  if (!raw) {
    if (!response.ok) {
      throw new ApiError(ErrorCode.INTERNAL_ERROR, `HTTP ${response.status}`, response.status)
    }
    return undefined as T
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
      response.status
    )
  }

  return data.data as T
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  return readEnvelope<T>(response)
}

async function uploadApi<T>(endpoint: string, file: File, fieldName = 'file'): Promise<T> {
  const body = new FormData()
  body.append(fieldName, file)

  // No Content-Type header — the browser sets the multipart boundary.
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    body,
  })

  return readEnvelope<T>(response)
}

export { fetchApi, uploadApi, ApiError, API_BASE }
