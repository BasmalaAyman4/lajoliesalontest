// ─── ResetPasswordForm Component ─────────────────────────────────────────────
//
//  Step 2 of the forgot-password flow.
//  6-digit OTP boxes (same pattern as OtpForm) + new password + confirm.

import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi'
import { Input, Button } from '@/components/shared'
import { useAuth } from '../hooks/useAuth'

const OTP_LENGTH = 6

const schema = z
  .object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

export default function ResetPasswordForm() {
  const { forgotPasswordReset, forgotPasswordResendOtp, isSendingForgotOtp, isResettingPassword } =
    useAuth()

  // ── OTP state (mirrors OtpForm pattern) ────────────────────────────────────
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // ── OTP handlers ───────────────────────────────────────────────────────────
  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setDigits(next)
    if (value && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    const next = Array(OTP_LENGTH).fill('')
    pasted.split('').forEach((ch, i) => (next[i] = ch))
    setDigits(next)
    refs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus()
  }

  const handleResend = () => {
    forgotPasswordResendOtp()
    setDigits(Array(OTP_LENGTH).fill(''))
    refs.current[0]?.focus()
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = ({ newPassword }: FormValues) => {
    const otp = digits.join('')
    if (otp.length < OTP_LENGTH) return
    forgotPasswordReset(otp, newPassword)
  }

  const otpFilled = digits.every(Boolean)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">

      {/* OTP digit boxes */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Enter OTP</span>
        <div className="flex gap-3 justify-center">
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-11 h-12 text-center text-lg font-bold rounded-[var(--radius)] bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)] focus:ring-2 focus:ring-[var(--accent-soft)] transition-all"
            />
          ))}
        </div>
      </div>

      {/* New password */}
      <Input
        {...register('newPassword')}
        label="New Password"
        type={showNew ? 'text' : 'password'}
        placeholder="Enter new password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        leftIcon={<HiLockClosed size={16} />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowNew((p) => !p)}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            aria-label={showNew ? 'Hide password' : 'Show password'}
          >
            {showNew ? <HiEyeOff size={16} /> : <HiEye size={16} />}
          </button>
        }
      />

      {/* Confirm password */}
      <Input
        {...register('confirmPassword')}
        label="Confirm Password"
        type={showConfirm ? 'text' : 'password'}
        placeholder="Re-enter new password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        leftIcon={<HiLockClosed size={16} />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowConfirm((p) => !p)}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <HiEyeOff size={16} /> : <HiEye size={16} />}
          </button>
        }
      />

      {/* Submit */}
      <Button
        type="submit"
        disabled={!otpFilled}
        loading={isResettingPassword}
        className="w-full"
      >
        Reset Password
      </Button>

     

    </form>
  )
}
