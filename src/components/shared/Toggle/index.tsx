import { useId } from 'react'
import { cn } from '@/lib/cn'

interface ToggleProps {
  /** Controlled checked state */
  checked: boolean
  /** Called with the new boolean value when toggled */
  onChange: (value: boolean) => void
  /** Optional label rendered beside the switch */
  label?: string
  /** Renders label before the switch (default: after) */
  labelPosition?: 'left' | 'right'
  /** Disables interaction */
  disabled?: boolean
  /** Extra classes on the root wrapper */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md'
  /** Language code — pass 'ar' to enable RTL layout */
  lang?: string
}

export default function Toggle({
  checked,
  onChange,
  label,
  labelPosition = 'right',
  disabled = false,
  className,
  size = 'md',
  lang,
}: ToggleProps) {
  const id = useId()
  const isRTL = lang === 'ar'

  // Track dimensions
  const trackSize =
    size === 'sm'
      ? 'w-8 h-[18px]'
      : 'w-10 h-[22px]'

  const thumbSize =
    size === 'sm'
      ? 'w-3 h-3'
      : 'w-4 h-4'

  // In RTL the thumb slides in the opposite direction:
  //   unchecked → right side  (translate-x negative = towards right in RTL)
  //   checked   → left side
  const thumbTranslate = isRTL
    ? size === 'sm'
      ? checked ? '-translate-x-[18px]' : '-translate-x-[3px]'
      : checked ? '-translate-x-[22px]' : '-translate-x-[3px]'
    : size === 'sm'
      ? checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
      : checked ? 'translate-x-[22px]' : 'translate-x-[3px]'

  const labelEl = label && (
    <label
      htmlFor={id}
      className={cn(
        'text-sm select-none',
        disabled
          ? 'text-[var(--text-disabled,#9ca3af)] cursor-not-allowed'
          : 'text-[var(--text-secondary)] cursor-pointer',
        // Arabic label styling
        isRTL && 'font-[system-ui] tracking-normal',
      )}
    >
      {label}
    </label>
  )

  // In RTL, flip the default visual order:
  // - labelPosition="right" should appear to the right (which is the START in RTL)
  // - labelPosition="left"  should appear to the left  (which is the END in RTL)
  // Using dir="rtl" on the wrapper handles this automatically via flexbox.
  const showLabelBefore = labelPosition === 'left'
  const showLabelAfter  = labelPosition === 'right'

  return (
    <div
      dir={isRTL ? 'rtl' : undefined}
      className={cn(
        'inline-flex items-center gap-2',
        disabled && 'opacity-50',
        className,
      )}
    >
      {showLabelBefore && labelEl}

      {/* Hidden native checkbox keeps it accessible & form-friendly */}
      <input
        id={id}
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />

      {/* Visual track */}
      <label
        htmlFor={id}
        className={cn(
          'relative inline-flex items-center rounded-full transition-colors duration-200',
          trackSize,
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
          checked
            ? 'bg-[var(--accent,#6366f1)]'
            : 'bg-[var(--border-strong,#d1d5db)]',
        )}
      >
        {/* Thumb — origin point flips with RTL */}
        <span
          className={cn(
            // RTL: anchor to the right edge; LTR: anchor to the left edge
            'absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm',
            'transition-transform duration-200 ease-in-out will-change-transform',
            isRTL ? 'right-0' : 'left-0',
            thumbSize,
            thumbTranslate,
          )}
        />
      </label>

      {showLabelAfter && labelEl}
    </div>
  )
}