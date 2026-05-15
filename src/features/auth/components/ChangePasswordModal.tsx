// ─── ChangePasswordModal ──────────────────────────────────────────────────────
//
//  Modal dialog for changing the authenticated user's password.
//  Closes on backdrop click, Escape key, or successful submission.

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HiLockClosed, HiEye, HiEyeOff, HiX } from 'react-icons/hi'
import { Input, Button } from '@/components/shared'
import { useAuth } from '../hooks/useAuth'

const schema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

export default function ChangePasswordModal({ onClose }: Props) {
  const { changePassword, isChangingPassword } = useAuth()
  const [show, setShow] = useState({ old: false, new: false, confirm: false })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const toggle = (field: 'old' | 'new' | 'confirm') =>
    setShow((s) => ({ ...s, [field]: !s[field] }))

  const onSubmit = async ({ oldPassword, newPassword }: FormValues) => {
    const success = await changePassword(oldPassword, newPassword)
    if (success) onClose()
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Panel — stop propagation so clicking inside doesn't close */}
      <div
        className="
          relative w-full max-w-sm mx-4
          bg-[var(--bg-card)] border border-[var(--border)]
          rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)]
          p-6 flex flex-col gap-5
          animate-fade-in
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Change Password
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Enter your current password then choose a new one.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius)] text-[var(--text-muted)]
              hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <HiX size={16} />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--border)]" />

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            {...register('oldPassword')}
            label="Current Password"
            type={show.old ? 'text' : 'password'}
            placeholder="Enter current password"
            autoComplete="current-password"
            error={errors.oldPassword?.message}
            leftIcon={<HiLockClosed size={15} />}
            rightIcon={
              <button
                type="button"
                onClick={() => toggle('old')}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                aria-label={show.old ? 'Hide' : 'Show'}
              >
                {show.old ? <HiEyeOff size={15} /> : <HiEye size={15} />}
              </button>
            }
          />

          <Input
            {...register('newPassword')}
            label="New Password"
            type={show.new ? 'text' : 'password'}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            leftIcon={<HiLockClosed size={15} />}
            rightIcon={
              <button
                type="button"
                onClick={() => toggle('new')}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                aria-label={show.new ? 'Hide' : 'Show'}
              >
                {show.new ? <HiEyeOff size={15} /> : <HiEye size={15} />}
              </button>
            }
          />

          <Input
            {...register('confirmPassword')}
            label="Confirm New Password"
            type={show.confirm ? 'text' : 'password'}
            placeholder="Re-enter new password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            leftIcon={<HiLockClosed size={15} />}
            rightIcon={
              <button
                type="button"
                onClick={() => toggle('confirm')}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
                aria-label={show.confirm ? 'Hide' : 'Show'}
              >
                {show.confirm ? <HiEyeOff size={15} /> : <HiEye size={15} />}
              </button>
            }
          />

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-[var(--radius)] border border-[var(--border)]
                text-sm font-medium text-[var(--text-secondary)]
                hover:bg-[var(--bg-hover)] transition-colors"
            >
              Cancel
            </button>
            <Button type="submit" loading={isChangingPassword} className="flex-1">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}