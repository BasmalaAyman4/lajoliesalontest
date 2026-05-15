import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

/**
 * Textarea – styled textarea with label/error/hint support.
 *
 * Works with react-hook-form:
 *   <Textarea {...register('description')} label="Description" rows={4} />
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => {
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

        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-[var(--radius)] border bg-[var(--bg-card)]',
            'text-[var(--text-primary)] text-sm',
            'px-3 py-2.5 outline-none transition-all duration-150 resize-y',
            'border-[var(--border)] placeholder:text-[var(--text-muted)]',
            'focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-soft)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[var(--danger)]',
            className,
          )}
          {...props}
        />

        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)]">{hint}</p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
export default Textarea
