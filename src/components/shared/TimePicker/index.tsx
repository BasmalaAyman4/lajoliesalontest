// ─── TimePicker (shared) ──────────────────────────────────────────────────────
//
//  12-hour clock picker. Produces/consumes { hour, minute } in 24-hour values
//  so the API always receives e.g. { hour: 14, minute: 30 } for 2:30 PM.
//
//  Works with react-hook-form via Controller:
//
//    <Controller
//      control={control}
//      name="openTime"
//      render={({ field }) => (
//        <TimePicker value={field.value} onChange={field.onChange} label="Open Time" />
//      )}
//    />

import { useState, useRef, useEffect } from 'react'
import { HiClock, HiChevronUp, HiChevronDown } from 'react-icons/hi'
import { cn } from '@/lib/cn'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface TimeValue {
  hour: number   // 0–23 (24-hour, what the API expects)
  minute: number // 0–59
}

interface TimePickerProps {
  value?: TimeValue
  onChange?: (value: TimeValue) => void
  label?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')

/** 24h → 12h display (returns 12 for midnight/noon, never 0) */
const to12h = (h: number) => {
  const v = h % 12
  return v === 0 ? 12 : v
}

/** Reconstruct 24h from 12h + period */
const to24h = (h12: number, period: 'AM' | 'PM'): number => {
  if (period === 'AM') return h12 === 12 ? 0 : h12
  return h12 === 12 ? 12 : h12 + 12
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v))

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const increment = () => onChange(value >= max ? min : value + 1)
  const decrement = () => onChange(value <= min ? max : value - 1)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10)
    if (!isNaN(v)) onChange(clamp(v, min, max))
  }

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={increment}
        className="w-8 h-7 flex items-center justify-center rounded
          text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
          transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <HiChevronUp size={15} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={pad(value)}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'w-10 text-center text-xl font-semibold tabular-nums',
          'bg-transparent outline-none rounded-md py-0.5',
          'text-[var(--text-primary)]',
          'focus:bg-[var(--accent-soft)] transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        )}
      />

      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={decrement}
        className="w-8 h-7 flex items-center justify-center rounded
          text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]
          transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        <HiChevronDown size={15} />
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function TimePicker({
  value,
  onChange,
  label,
  error,
  disabled = false,
  required = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Derive 12h display state from the 24h value
  const hour24 = value?.hour ?? 9
  const minute = value?.minute ?? 0
  const period: 'AM' | 'PM' = hour24 < 12 ? 'AM' : 'PM'
  const hour12 = to12h(hour24)

  // Emit back as 24h { hour, minute }
  const emit = (h12: number, m: number, p: 'AM' | 'PM') => {
    onChange?.({ hour: to24h(h12, p), minute: m })
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="flex flex-col gap-1 w-full relative" ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="text-sm font-medium text-[var(--text-secondary)]">
          {label}
          {required && <span className="text-[var(--danger)] ms-1">*</span>}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius)]',
          'border bg-[var(--bg-card)] text-sm text-start',
          'transition-all duration-150 outline-none',
          'border-[var(--border)] hover:border-[var(--border-focus)]',
          'focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-soft)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          open && 'border-[var(--border-focus)] ring-2 ring-[var(--accent-soft)]',
          error && 'border-[var(--danger)]',
        )}
      >
        <HiClock size={15} className="text-[var(--text-muted)] shrink-0" />
        <span className="text-[var(--text-primary)] tabular-nums font-medium">
          {pad(hour12)}:{pad(minute)} {period}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            'absolute top-full mt-1 left-0 z-50',
            'rounded-[var(--radius)] border border-[var(--border)]',
            'bg-[var(--bg-card)] shadow-[var(--shadow-lg)]',
            'p-4 flex flex-col gap-3',
             )}
          style={{ position: 'absolute' , zIndex:10000000}}

        >
          {/* Spinners row */}
          <div className="flex items-center gap-2">
            {/* Hour (1–12) */}
            <Spinner
              value={hour12}
              min={1}
              max={12}
              onChange={(h12) => emit(h12, minute, period)}
              disabled={disabled}
            />

            <span className="text-2xl font-bold text-[var(--text-muted)] mb-0.5 select-none">
              :
            </span>

            {/* Minute (0–59) */}
            <Spinner
              value={minute}
              min={0}
              max={59}
              onChange={(m) => emit(hour12, m, period)}
              disabled={disabled}
            />

            {/* AM / PM toggle */}
            <div className="flex flex-col gap-1 ms-2">
              {(['AM', 'PM'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={disabled}
                  onClick={() => emit(hour12, minute, p)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-semibold transition-all',
                    period === p
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Done */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full text-xs font-semibold py-2 rounded-[var(--radius)]
              bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]
              transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  )
}