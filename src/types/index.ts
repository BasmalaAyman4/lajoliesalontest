// ─── Shared API types ─────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  [key: string]: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DropdownOption {
  value: string | number
  label: string
  [key: string]: unknown
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
}

