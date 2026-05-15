import { HiCheckCircle, HiClock, HiXCircle, HiInformationCircle, HiMinusCircle } from 'react-icons/hi'
import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

// ── Variant definitions ───────────────────────────────────────────────────────
export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface VariantStyle {
  container: string
  dot: string
  icon: ReactNode
}

const VARIANT_STYLES: Record<BadgeVariant, VariantStyle> = {
  success: {
    container: 'bg-[var(--success)]/10 text-[var(--success)]',
    dot: 'bg-[var(--success)]',
    icon: <HiCheckCircle size={12} />,
  },
  warning: {
    container: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    dot: 'bg-[var(--warning)]',
    icon: <HiClock size={12} />,
  },
  danger: {
    container: 'bg-[var(--danger)]/10 text-[var(--danger)]',
    dot: 'bg-[var(--danger)]',
    icon: <HiXCircle size={12} />,
  },
  info: {
    container: 'bg-[var(--info)]/10 text-[var(--info)]',
    dot: 'bg-[var(--info)]',
    icon: <HiInformationCircle size={12} />,
  },
  neutral: {
    container: 'bg-[var(--border)] text-[var(--text-muted)]',
    dot: 'bg-[var(--text-muted)]',
    icon: <HiMinusCircle size={12} />,
  },
}

const VALID_VARIANTS = new Set<string>(Object.keys(VARIANT_STYLES))

// ── Props ─────────────────────────────────────────────────────────────────────
type StatusBadgeProps =
  | {
      /** Boolean shorthand: true → success, false → warning */
      approved: boolean
      approvedLabel?: string
      pendingLabel?: string
      variant?: never
      label?: never
      icon?: ReactNode
      dot?: boolean
      className?: string
    }
  | {
      approved?: never
      approvedLabel?: never
      pendingLabel?: never
      /** Explicit variant */
      variant: BadgeVariant
      label: string
      icon?: ReactNode
      dot?: boolean
      className?: string
    }

// ── Component ─────────────────────────────────────────────────────────────────
export default function StatusBadge(props: StatusBadgeProps) {
  const { dot = false, className } = props

  // Resolve variant + label
  let variant: BadgeVariant
  let label: string

  if (props.approved !== undefined) {
    // Coerce to real boolean in case the API sends "true"/"false" strings
    const isApproved = props.approved === true || (props.approved as unknown) === 'true'
    variant = isApproved ? 'success' : 'warning'
    label = isApproved
      ? (props.approvedLabel ?? 'Approved')
      : (props.pendingLabel ?? 'Pending')
  } else {
    variant = props.variant
    label = props.label
  }

  // Safety net: if variant is somehow invalid, fall back to neutral
  const safeVariant: BadgeVariant =
    variant && VALID_VARIANTS.has(variant) ? variant : 'neutral'

  const styles = VARIANT_STYLES[safeVariant]
  const icon = props.icon ?? styles.icon

  // ── Dot-only mode ───────────────────────────────────────────────────────────
  if (dot) {
    return (
      <span
        title={label}
        className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0', styles.dot, className)}
      />
    )
  }

  // ── Full badge ──────────────────────────────────────────────────────────────
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-xs font-medium whitespace-nowrap',
        styles.container,
        className,
      )}
    >
      {icon}
      {label}
    </span>
  )
}