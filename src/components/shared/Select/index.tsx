import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import type { DropdownOption } from '@/types'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: DropdownOption[]
  placeholder?: string
}

/**
 * Select – native <select> with options from DropdownOption[].
 *
 * Works with react-hook-form:
 *   <Select {...register('categoryId')} options={categoryOptions} label="Category" />
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
            {props.required && (
              <span className="text-[var(--danger)] ms-1">*</span>
            )}
          </label>
        )}

        <select
          ref={ref}
          className={cn(
            'w-full rounded-[var(--radius)] border bg-[var(--bg-card)]',
            'text-[var(--text-primary)] text-sm',
            'px-3 py-2.5 outline-none transition-all duration-150',
            'border-[var(--border)]',
            'focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-soft)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'appearance-none cursor-pointer',
            error && 'border-[var(--danger)]',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    )
  },
)

Select.displayName = 'Select'
export default Select
