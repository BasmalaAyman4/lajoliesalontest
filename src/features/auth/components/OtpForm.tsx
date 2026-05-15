// ─── OtpForm Component ────────────────────────────────────────────────────────
//
//  6-digit OTP input — each digit is its own box.
//  Auto-advances focus on input, backspace goes back, supports paste.

import { useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react'
import { Button } from '@/components/shared'
import { useAuth } from '../hooks/useAuth'

const OTP_LENGTH = 6

export default function OtpForm() {
  const { verifyOtp, sendOtp, pendingUserId, isVerifying, isSendingOtp } = useAuth()
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const refs = useRef<(HTMLInputElement | null)[]>([])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setDigits(next)
    if (value && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus()
    }
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

  const handleSubmit = () => {
    const otp = digits.join('')
    if (otp.length < OTP_LENGTH) return
    verifyOtp(otp)
  }

  const handleResend = () => {
    if (pendingUserId) sendOtp(pendingUserId)
    setDigits(Array(OTP_LENGTH).fill(''))
    refs.current[0]?.focus()
  }

  const filled = digits.every(Boolean)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* OTP digit boxes */}
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

      {/* Verify */}
      <Button
        onClick={handleSubmit}
        disabled={!filled}
        loading={isVerifying}
        className="w-full"
      >
        Verify Phone
      </Button>

      {/* Resend */}
      <p className="text-center text-sm text-[var(--text-muted)]">
        Didn't receive the code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={isSendingOtp}
          className="text-[var(--accent)] hover:underline disabled:opacity-50 font-medium cursor-pointer"
        >
          {isSendingOtp ? 'Sending…' : 'Resend'}
        </button>
      </p>

    </div>
  )
}