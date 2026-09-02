const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  errorCode?: string
  message?: string
  timestamp?: string
}

export enum ErrorCode {
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

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data: ApiResponse<T> = await response.json()

  if (!data.success) {
    throw new ApiError(
      data.errorCode || ErrorCode.INTERNAL_ERROR,
      data.message || 'An error occurred',
      response.status
    )
  }

  if (!response.ok) {
    throw new ApiError(
      data.errorCode || ErrorCode.INTERNAL_ERROR,
      data.message || `HTTP ${response.status}`,
      response.status
    )
  }

  return data.data as T
}

export { fetchApi, ApiError, API_BASE }
