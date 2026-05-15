import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  /** Icon rendered on the left side */
  leftIcon?: React.ReactNode
  /** Icon rendered on the right side */
  rightIcon?: React.ReactNode
}

/**
 * Input – base text input with label, error, hint and icon slots.
 *
 * Works with react-hook-form via forwardRef:
 *   <Input {...register('title')} error={errors.title?.message} label="Title" />
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, ...props }, ref) => {
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

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute start-3 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            className={cn(
              'w-full rounded-[var(--radius)] border bg-[var(--bg-card)]',
              'text-[var(--text-primary)] text-sm',
              'px-3 py-2.5 outline-none transition-all duration-150',
              'border-[var(--border)] placeholder:text-[var(--text-muted)]',
              'focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-soft)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon && 'ps-9',
              rightIcon && 'pe-9',
              error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-red-500/10',
              className,
            )}
            {...props}
          />

          {rightIcon && (
            <span className="absolute end-3 text-[var(--text-muted)]">
              {rightIcon}
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs text-[var(--danger)] mt-0.5">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
export default Input
