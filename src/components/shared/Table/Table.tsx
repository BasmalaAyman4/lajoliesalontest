import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { useTranslation } from 'react-i18next'
import { HiChevronUp, HiChevronDown, HiFilter } from 'react-icons/hi'
import { TbMoodEmpty } from 'react-icons/tb'

export interface ColumnFilterOption {
  label: string
  value: string | number
}

export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
  width?: string
  align?: 'left' | 'center' | 'right'
  filterOptions?: ColumnFilterOption[]
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: keyof T
  loading?: boolean
  skeletonRows?: number
  emptyMessage?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string, dir: 'asc' | 'desc') => void
  onRowClick?: (row: T) => void
  columnFilters?: Record<string, string | number | ''>
  onColumnFilterChange?: (key: string, value: string | number | '') => void
}

function getNestedValue(row: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k]
    return undefined
  }, row)
}

// ── Dropdown ─────────────────────────────────────────
function ColumnFilterDropdown({
  options,
  activeValue,
  onSelect,
  isRTL,
}: {
  options: ColumnFilterOption[]
  activeValue: string | number | ''
  onSelect: (value: string | number | '') => void
  isRTL: boolean
}) {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'absolute z-50 top-full mt-1',
 'start-0',
        'min-w-[160px] rounded-[var(--radius)] border border-[var(--border)]',
        'bg-[var(--bg-card)] shadow-lg overflow-hidden flex flex-col',
      )}
    >
      <button
        onClick={() => onSelect('')}
        className={cn(
          'w-full text-start px-3 py-2.5 text-xs transition-colors border-b border-[var(--border)]',
          activeValue === ''
            ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
          isRTL && 'text-right',
        )}
      >
        {t('common.all', 'All')}
      </button>

      {options.map((opt, i) => (
        <button
          key={String(opt.value)}
          onClick={() => onSelect(opt.value)}
          className={cn(
            'w-full text-start px-3 py-2.5 text-xs transition-colors',
            i < options.length - 1 && 'border-b border-[var(--border)]',
            String(activeValue) === String(opt.value)
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
            isRTL && 'text-right',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Table ────────────────────────────────────────────
export default function Table<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyMessage,
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSort,
  onRowClick,
  columnFilters = {},
  onColumnFilterChange,
}: TableProps<T>) {
  const { t, i18n } = useTranslation()
  const isRTL = i18n.language === 'ar'

  const [localSortKey, setLocalSortKey] = useState('')
  const [localSortDir, setLocalSortDir] = useState<'asc' | 'desc'>('asc')
  const [openFilterKey, setOpenFilterKey] = useState<string | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  const activeSortKey = controlledSortKey ?? localSortKey
  const activeSortDir = controlledSortDir ?? localSortDir

  const handleSort = (key: string) => {
    const dir = activeSortKey === key && activeSortDir === 'asc' ? 'desc' : 'asc'
    if (!controlledSortKey) {
      setLocalSortKey(key)
      setLocalSortDir(dir)
    }
    onSort?.(key, dir)
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setOpenFilterKey(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div
      className="overflow-x-auto w-full"
      ref={filterRef}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <table className="w-full text-sm border-collapse">

        {/* Head */}
        <thead>
          <tr className="bg-[var(--table-bg)]">
            {columns.map((col) => {
              const colKey = String(col.key)
              const isFilterOpen = openFilterKey === colKey

              return (
                <th
                  key={colKey}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3.5 text-left',
                    'text-[11px] font-semibold uppercase tracking-widest text-[var(--text-primary)]',
                    'whitespace-nowrap select-none',
                    isRTL && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && (isRTL ? 'text-left' : 'text-end'),
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5',
                      isRTL && 'flex-row-reverse',
                    )}
                  >
                    {/* Label */}
                    <span
                      onClick={col.sortable ? () => handleSort(colKey) : undefined}
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.sortable && 'cursor-pointer hover:text-[var(--accent)]',
                      )}
                    >
                      {col.label}
                      {col.sortable && (
                        <span className="flex flex-col gap-[1px] opacity-60">
                          <HiChevronUp size={9} />
                          <HiChevronDown size={9} />
                        </span>
                      )}
                    </span>

                    {/* Filter */}
                    {col.filterOptions && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenFilterKey(isFilterOpen ? null : colKey)
                          }}
                          className="w-5 h-5 flex items-center justify-center"
                        >
                          <HiFilter size={10} />
                        </button>

                        {isFilterOpen && (
                          <ColumnFilterDropdown
                            options={col.filterOptions}
                            activeValue={columnFilters[colKey] ?? ''}
                            onSelect={(value) => {
                              onColumnFilterChange?.(colKey, value)
                              setOpenFilterKey(null)
                            }}
                            isRTL={isRTL}
                          />
                        )}
                      </div>
                    )}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--border)]">
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3.5">
                    <div className="h-4 rounded-md bg-[var(--bg-hover)] animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}

          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length}>
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-[var(--text-muted)]">
                  <TbMoodEmpty size={36} className="opacity-30" />
                  <p className="text-sm">
                    {emptyMessage ?? t('common.noData', 'No data found')}
                  </p>
                </div>
              </td>
            </tr>
          )}

          {!loading &&
            data.map((row, rowIndex) => (
              <tr
                key={String(row[rowKey])}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-[var(--border)] transition-colors duration-100',
                  'hover:bg-[var(--bg-hover)]',
                  onRowClick && 'cursor-pointer',
                  rowIndex % 2 === 0 ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg)]',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      'px-4 py-3 text-[var(--text-primary)] whitespace-nowrap',
                      isRTL && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' &&
                        (isRTL ? 'text-left' : 'text-end'),
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : String(getNestedValue(row, String(col.key)) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}