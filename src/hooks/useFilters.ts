import { useState, useCallback } from 'react'
import type { PaginationParams } from '@/types'

const DEFAULTS: Required<PaginationParams> = { page: 1, limit: 10, search: '' }

/**
 * useFilters – manages filter + pagination state for any list page.
 *
 * Usage:
 *   const { filters, setFilter, resetFilters, setPage } = useFilters({ status: '' })
 *   // Pass filters directly to RTK Query hook
 *   useGetScheduleEventsQuery(filters)
 */
export function useFilters<T extends PaginationParams>(extra?: Partial<T>) {
  const [filters, setFilters] = useState<T>({
    ...DEFAULTS,
    ...extra,
  } as T)

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value, page: 1 })),
    [],
  )

  const setPage = useCallback(
    (page: number) => setFilters((prev) => ({ ...prev, page })),
    [],
  )

  const setLimit = useCallback(
    (limit: number) => setFilters((prev) => ({ ...prev, limit, page: 1 })),
    [],
  )

  const resetFilters = useCallback(
    () => setFilters({ ...DEFAULTS, ...extra } as T),
    [extra],
  )

  return { filters, setFilter, setPage, setLimit, resetFilters }
}
