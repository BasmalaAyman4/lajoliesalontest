import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/cn'
import type { DropdownOption } from '@/types'
import { HiX, HiChevronDown } from 'react-icons/hi'

interface MultiSelectProps {
  label?: string
  error?: string
  hint?: string
  options: DropdownOption[]
  value?: (string | number)[]
  onChange?: (value: (string | number)[]) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

/**
 * MultiSelect – custom dropdown that allows multiple selections.
 * Selected items are shown as removable chips.
 *
 * Works with react-hook-form via Controller:
 *   <Controller name="attendees" control={control}
 *     render={({ field }) => <MultiSelect {...field} options={...} />}
 *   />
 */
export default function MultiSelect({
  label,
  error,
  hint,
  options,
  value = [],
  onChange,
  placeholder = 'Select…',
  disabled,
  required,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  )

  const toggle = (val: string | number) => {
    const next = value.includes(val)
      ? value.filter((v) => v !== val)
      : [...value, val]
    onChange?.(next)
  }

  const remove = (val: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(value.filter((v) => v !== val))
  }

  const labelOf = (val: string | number) =>
    options.find((o) => o.value === val)?.label ?? String(val)

  return (
    <div className="flex flex-col gap-1 w-full" ref={ref}>
      {label && (
        <label className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="text-[var(--danger)] ms-1">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'relative min-h-[42px] flex flex-wrap items-center gap-1.5',
          'rounded-[var(--radius)] border bg-[var(--bg-card)] px-3 py-2 cursor-pointer',
          'border-[var(--border)] transition-all duration-150',
          open && 'border-[var(--border-focus)] ring-2 ring-[var(--accent-soft)]',
          error && 'border-[var(--danger)]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {value.length === 0 && (
          <span className="text-sm text-[var(--text-muted)]">{placeholder}</span>
        )}

        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 text-xs font-medium
              bg-[var(--accent-soft)] text-[var(--accent)] rounded-full px-2.5 py-0.5"
          >
            {labelOf(v)}
            <button
              type="button"
              onClick={(e) => remove(v, e)}
              className="hover:text-[var(--danger)] transition-colors"
            >
              <HiX size={10} />
            </button>
          </span>
        ))}

        <HiChevronDown
          className={cn(
            'ms-auto text-[var(--text-muted)] transition-transform duration-150',
            open && 'rotate-180',
          )}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="relative z-50 mt-1 rounded-[var(--radius)] border border-[var(--border)]
            bg-[var(--bg-card)] shadow-[var(--shadow)] overflow-hidden animate-fade-in"
        >
          <div className="p-2 border-b border-[var(--border)]">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-[var(--bg-hover)] rounded-md px-2.5 py-1.5 text-sm
                text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>

          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--text-muted)]">No results</li>
            ) : (
              filtered.map((opt) => {
                const selected = value.includes(opt.value)
                return (
                  <li
                    key={opt.value}
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors',
                      'hover:bg-[var(--bg-hover)]',
                      selected && 'text-[var(--accent)]',
                    )}
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                        selected
                          ? 'bg-[var(--accent)] border-[var(--accent)]'
                          : 'border-[var(--border)]',
                      )}
                    >
                      {selected && (
                        <svg viewBox="0 0 12 9" width="10" fill="none">
                          <path
                            d="M1 4l3.5 3.5L11 1"
                            stroke="white"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    {opt.label}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  )
}
