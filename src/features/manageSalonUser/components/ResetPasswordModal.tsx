// ─── ResetPasswordModal ───────────────────────────────────────────────────────
//  POST /api/salon/SalonAuth/resetPassword  { userId, newPassword }

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { Modal, Input, Button } from '@/components/shared'
import type { SalonUser } from '../types'
import { useResetSalonUserPasswordMutation } from '../services/salonUserApi'

const schema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  user?: SalonUser
}

export default function ResetPasswordModal({ open, onClose, user }: Props) {
  const { t } = useTranslation()
  const [resetPassword, { isLoading }] = useResetSalonUserPasswordMutation()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (open) reset({ newPassword: '', confirmPassword: '' })
  }, [open, reset])

  const onSubmit = async ({ newPassword }: FormValues) => {
    if (!user) return
    try {
        console.log(user.id, newPassword)
      await resetPassword({ userId: user.id, newPassword }).unwrap()
      toast.success(t('user.resetPasswordSuccess', 'Password reset successfully'))
      onClose()
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('user.resetPassword', 'Reset Password')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isLoading}>
            {t('user.resetPassword', 'Reset Password')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1 mb-4 p-3 rounded-lg bg-[var(--surface-raised)]
        border border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)]">{t('user.name', 'User')}</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">{user?.name}</p>
        <p className="text-xs text-[var(--text-muted)] font-mono">{user?.username}</p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          {...register('newPassword')}
          type="password"
          label={t('user.newPassword', 'New Password')}
          placeholder={t('user.passwordPlaceholder', 'Min. 6 characters')}
          error={errors.newPassword?.message}
          required
        />
        <Input
          {...register('confirmPassword')}
          type="password"
          label={t('user.confirmPassword', 'Confirm Password')}
          placeholder={t('user.confirmPasswordPlaceholder', 'Re-enter password')}
          error={errors.confirmPassword?.message}
          required
        />
      </div>
    </Modal>
  )
}