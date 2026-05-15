/* 

import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { HiSearch, HiX, HiChevronLeft, HiChevronRight, HiFilter } from 'react-icons/hi'
import { cn } from '@/lib/cn'
import Table, { type Column } from './Table'
import { Input, Select, Button } from '@/components/shared'
// ── Filter definition ─────────────────────────────────────────────────────────
export interface FilterOption {
  label: string
  value: string | number
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

// ── Active filter state ───────────────────────────────────────────────────────
type ActiveFilters = Record<string, string | number | ''>

const LIMIT_OPTIONS = [5, 10, 25, 50]

// ── Pagination component (internal) ──────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (p: number) => void
  onLimitChange: (l: number) => void
}) {
  const { t } = useTranslation()

  // Smart page window: always show up to 5 pages centered on current
  const pageWindow = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const half = 2
    let start = Math.max(1, page - half)
    let end = Math.min(totalPages, page + half)
    if (end - start < 4) {
      if (start === 1) end = Math.min(5, totalPages)
      else start = Math.max(1, end - 4)
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [page, totalPages])

  if (totalPages <= 1 && total <= Math.min(...LIMIT_OPTIONS)) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-card)]">

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">{t('common.rowsPerPage', 'Rows')}:</span>
        <Select
          value={limit}
          onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(1) }}
          options={LIMIT_OPTIONS.map((l) => ({ label: String(l), value: l }))}
          className="text-xs py-1 px-2 min-w-[64px]"
        />
      </div>

      <span className="text-xs text-[var(--text-muted)]">
        {total} {t('common.rows', 'rows')} · {t('common.page', 'page')} {page}/{totalPages}
      </span>

      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-[var(--radius)]',
            'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          <HiChevronLeft size={15} />
        </button>

        {pageWindow[0] > 1 && (
          <>
            <PageBtn n={1} current={page} onClick={onPageChange} />
            {pageWindow[0] > 2 && <span className="text-xs text-[var(--text-muted)] px-1">…</span>}
          </>
        )}

        {pageWindow.map((n) => <PageBtn key={n} n={n} current={page} onClick={onPageChange} />)}

        {pageWindow[pageWindow.length - 1] < totalPages && (
          <>
            {pageWindow[pageWindow.length - 1] < totalPages - 1 && (
              <span className="text-xs text-[var(--text-muted)] px-1">…</span>
            )}
            <PageBtn n={totalPages} current={page} onClick={onPageChange} />
          </>
        )}

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-[var(--radius)]',
            'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          <HiChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

function PageBtn({ n, current, onClick }: { n: number; current: number; onClick: (n: number) => void }) {
  return (
    <button
      onClick={() => onClick(n)}
      className={cn(
        'w-7 h-7 rounded-[var(--radius)] text-xs font-medium transition-all duration-150',
        n === current
          ? 'bg-[var(--accent)] text-white shadow-sm scale-105'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {n}
    </button>
  )
}

// ── DataTable props ───────────────────────────────────────────────────────────
interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: keyof T
  loading?: boolean

  // ── Toolbar ──
  toolbar?: React.ReactNode

  // ── Search ──
  searchKeys?: (keyof T | string)[]
  onSearch?: (q: string) => void
  searchPlaceholder?: string

  // ── Filters ──
  filters?: FilterConfig[]
  onFilterChange?: (filters: ActiveFilters) => void

  // ── Sorting ──
  onSort?: (key: string, dir: 'asc' | 'desc') => void

  // ── Pagination (server-side) ──
  total?: number
  page?: number
  limit?: number
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void

  emptyMessage?: string
  onRowClick?: (row: T) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  toolbar,
  searchKeys = [],
  onSearch,
  searchPlaceholder,
  filters = [],
  onFilterChange,
  onSort,
  total: serverTotal,
  page: serverPage,
  limit: serverLimit,
  onPageChange: serverOnPageChange,
  onLimitChange: serverOnLimitChange,
  emptyMessage,
  onRowClick,
  
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const isServerSide = serverTotal !== undefined

  // ── Local state (client-side mode) ───────────────────────────────────────
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({})
  const [localPage, setLocalPage] = useState(1)
  const [localLimit, setLocalLimit] = useState(10)
  const [columnFilters, setColumnFilters] = useState<Record<string, string | number | ''>>({})
  const handleColumnFilterChange = useCallback((key: string, value: string | number | '') => {
    setColumnFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (value === '') delete next[key]
      return next
    })
    setLocalPage(1)
  }, [])
  const hasActiveColumnFilters = Object.keys(columnFilters).length > 0

  // ── Resolved pagination values ────────────────────────────────────────────
  const page = isServerSide ? (serverPage ?? 1) : localPage
  const limit = isServerSide ? (serverLimit ?? 10) : localLimit

  const handleSearch = useCallback((q: string) => {
    setSearch(q)
    setLocalPage(1)
    onSearch?.(q)
  }, [onSearch])

  const handleFilterChange = useCallback((key: string, value: string | number | '') => {
    const next = { ...activeFilters, [key]: value }
    if (value === '') delete next[key]
    setActiveFilters(next)
    setLocalPage(1)
    onFilterChange?.(next)
  }, [activeFilters, onFilterChange])


  const handlePageChange = (p: number) => {
    if (isServerSide) serverOnPageChange?.(p)
    else setLocalPage(p)
  }

  const handleLimitChange = (l: number) => {
    if (isServerSide) serverOnLimitChange?.(l)
    else { setLocalLimit(l); setLocalPage(1) }
  }

  // ── Client-side data processing ───────────────────────────────────────────
const processedData = useMemo(() => {
  if (isServerSide) return data

  let result = [...data]

  // Search
  if (search.trim() && searchKeys.length > 0) {
    const q = search.toLowerCase()
    result = result.filter((row) =>
      searchKeys.some((key) => {
        const val = String((row as Record<string, unknown>)[key as string] ?? '')
        return val.toLowerCase().includes(q)
      }),
    )
  }

  // Column filters
  Object.entries(columnFilters).forEach(([key, value]) => {
    if (value === '') return
    result = result.filter((row) =>
      String((row as Record<string, unknown>)[key]) === String(value),
    )
  })

  return result
}, [data, search, searchKeys, columnFilters, isServerSide]) // ← columnFilters added, activeFilters removed
  const total = isServerSide ? (serverTotal ?? 0) : processedData.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  // Paginate client-side
  const pageData = isServerSide
    ? processedData
    : processedData.slice((page - 1) * limit, page * limit)



  return (
    <div className="flex flex-col  overflow-hidden ">

      <div className="flex flex-wrap items-center gap-3 px-4 py-3 ">

        <div className="flex-1 min-w-[180px] max-w-xs">
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder ?? t('common.search', 'Search…')}
            leftIcon={<HiSearch size={15} />}
            rightIcon={
              search ? (
                <button onClick={() => handleSearch('')} className="hover:text-[var(--text-primary)] transition-colors">
                  <HiX size={13} />
                </button>
              ) : null
            }
          />
        </div>




      </div>



      <Table<T>
        columns={columns}
        data={pageData}
        rowKey={rowKey}
        loading={loading}
        skeletonRows={limit}
        emptyMessage={emptyMessage}
        onSort={onSort}
        onRowClick={onRowClick}
        columnFilters={columnFilters}
        onColumnFilterChange={handleColumnFilterChange}
        hasActiveColumnFilters={hasActiveColumnFilters}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />
    </div>
  )
} */

  import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { HiSearch, HiX, HiChevronLeft, HiChevronRight } from 'react-icons/hi'
import { cn } from '@/lib/cn'
import Table, { type Column } from './Table'
import { Input, Select } from '@/components/shared'

export interface FilterOption {
  label: string
  value: string | number
}

export interface FilterConfig {
  key: string
  label: string
  options: FilterOption[]
}

type ActiveFilters = Record<string, string | number | ''>

const LIMIT_OPTIONS = [5, 10, 25, 50]

// ── Pagination ────────────────────────────────────────────────────────────────
function Pagination({
  page, totalPages, total, limit, onPageChange, onLimitChange,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPageChange: (p: number) => void
  onLimitChange: (l: number) => void
}) {
  const { t } = useTranslation()

  const pageWindow = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const half = 2
    let start = Math.max(1, page - half)
    let end   = Math.min(totalPages, page + half)
    if (end - start < 4) {
      if (start === 1) end = Math.min(5, totalPages)
      else start = Math.max(1, end - 4)
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [page, totalPages])

  if (totalPages <= 1 && total <= Math.min(...LIMIT_OPTIONS)) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-card)]">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">{t('common.rowsPerPage', 'Rows')}:</span>
        <Select
          value={limit}
          onChange={(e) => { onLimitChange(Number(e.target.value)); onPageChange(1) }}
          options={LIMIT_OPTIONS.map((l) => ({ label: String(l), value: l }))}
          className="text-xs py-1 px-2 min-w-[64px]"
        />
      </div>

      <span className="text-xs text-[var(--text-muted)]">
        {total} {t('common.rows', 'rows')} · {t('common.page', 'page')} {page}/{totalPages}
      </span>

      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-[var(--radius)]',
            'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          <HiChevronLeft size={15} />
        </button>

        {pageWindow[0] > 1 && (
          <>
            <PageBtn n={1} current={page} onClick={onPageChange} />
            {pageWindow[0] > 2 && <span className="text-xs text-[var(--text-muted)] px-1">…</span>}
          </>
        )}

        {pageWindow.map((n) => <PageBtn key={n} n={n} current={page} onClick={onPageChange} />)}

        {pageWindow[pageWindow.length - 1] < totalPages && (
          <>
            {pageWindow[pageWindow.length - 1] < totalPages - 1 && (
              <span className="text-xs text-[var(--text-muted)] px-1">…</span>
            )}
            <PageBtn n={totalPages} current={page} onClick={onPageChange} />
          </>
        )}

        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-[var(--radius)]',
            'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          <HiChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

function PageBtn({ n, current, onClick }: { n: number; current: number; onClick: (n: number) => void }) {
  return (
    <button
      onClick={() => onClick(n)}
      className={cn(
        'w-7 h-7 rounded-[var(--radius)] text-xs font-medium transition-all duration-150',
        n === current
          ? 'bg-[var(--accent)] text-white shadow-sm scale-105'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {n}
    </button>
  )
}

// ── DataTable props ───────────────────────────────────────────────────────────
interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: keyof T
  loading?: boolean
  toolbar?: React.ReactNode
  searchKeys?: (keyof T | string)[]
  onSearch?: (q: string) => void
  searchPlaceholder?: string
  filters?: FilterConfig[]
  onFilterChange?: (filters: ActiveFilters) => void
  onSort?: (key: string, dir: 'asc' | 'desc') => void
  total?: number
  page?: number
  limit?: number
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  toolbar,
  searchKeys = [],
  onSearch,
  searchPlaceholder,
  filters = [],
  onFilterChange,
  onSort,
  total: serverTotal,
  page: serverPage,
  limit: serverLimit,
  onPageChange: serverOnPageChange,
  onLimitChange: serverOnLimitChange,
  emptyMessage,
  onRowClick,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const isServerSide = serverTotal !== undefined

  // ── Search state ──────────────────────────────────────────────────────────
  // In server-side mode the parent owns the search value (via onSearch).
  // We still keep a local string so the input feels instant — but we never
  // use it to filter `data` when server-side.
  const [localSearch, setLocalSearch] = useState('')

  const handleSearch = useCallback((q: string) => {
    setLocalSearch(q)
    onSearch?.(q)          // parent debounces & fires the API call
  }, [onSearch])

  // ── Other local state ─────────────────────────────────────────────────────
  const [activeFilters, setActiveFilters]   = useState<ActiveFilters>({})
  const [localPage, setLocalPage]           = useState(1)
  const [localLimit, setLocalLimit]         = useState(10)
  const [columnFilters, setColumnFilters]   = useState<Record<string, string | number | ''>>({})

  const handleColumnFilterChange = useCallback((key: string, value: string | number | '') => {
    setColumnFilters((prev) => {
      const next = { ...prev, [key]: value }
      if (value === '') delete next[key]
      return next
    })
    setLocalPage(1)
  }, [])

  const hasActiveColumnFilters = Object.keys(columnFilters).length > 0

  const page  = isServerSide ? (serverPage  ?? 1)  : localPage
  const limit = isServerSide ? (serverLimit ?? 10) : localLimit

  const handlePageChange = (p: number) => {
    if (isServerSide) serverOnPageChange?.(p)
    else setLocalPage(p)
  }

  const handleLimitChange = (l: number) => {
    if (isServerSide) serverOnLimitChange?.(l)
    else { setLocalLimit(l); setLocalPage(1) }
  }

  // ── Client-side filtering (only in client-side mode) ──────────────────────
  const processedData = useMemo(() => {
    // Server-side: data is already filtered/paginated by the backend — use as-is
    if (isServerSide) return data

    let result = [...data]

    if (localSearch.trim() && searchKeys.length > 0) {
      const q = localSearch.toLowerCase()
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const val = String((row as Record<string, unknown>)[key as string] ?? '')
          return val.toLowerCase().includes(q)
        }),
      )
    }

    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value === '') return
      result = result.filter((row) =>
        String((row as Record<string, unknown>)[key]) === String(value),
      )
    })

    return result
  }, [data, localSearch, searchKeys, columnFilters, isServerSide])

  const total      = isServerSide ? (serverTotal ?? 0) : processedData.length
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const pageData = isServerSide
    ? processedData
    : processedData.slice((page - 1) * limit, page * limit)

  return (
    <div className="flex flex-col overflow-hidden">
      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <Input
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder ?? t('common.search', 'Search…')}
            leftIcon={<HiSearch size={15} />}
            rightIcon={
              localSearch ? (
                <button
                  onClick={() => handleSearch('')}
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  <HiX size={13} />
                </button>
              ) : null
            }
          />
        </div>
        {toolbar}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Table<T>
        columns={columns}
        data={pageData}
        rowKey={rowKey}
        loading={loading}
        skeletonRows={limit}
        emptyMessage={emptyMessage}
        onSort={onSort}
        onRowClick={onRowClick}
        columnFilters={columnFilters}
        onColumnFilterChange={handleColumnFilterChange}
        hasActiveColumnFilters={hasActiveColumnFilters}
      />

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
      />
    </div>
  )
}