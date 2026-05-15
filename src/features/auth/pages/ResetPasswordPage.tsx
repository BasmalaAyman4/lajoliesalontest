// ─── ResetPasswordPage ────────────────────────────────────────────────────────
//
//  Step 2: user enters OTP + new password.
//  Guards against direct navigation — if forgotPasswordMobile is missing,
//  redirect back to step 1.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/hooks/useAppStore'
import AuthLayout from '../components/AuthLayout'
import ResetPasswordForm from '../components/ResetPasswordForm'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const forgotPasswordMobile = useAppSelector((s) => s.auth.forgotPasswordMobile)

  useEffect(() => {
    if (forgotPasswordMobile === null) {
      navigate('/forgot-password', { replace: true })
    }
  }, []) // ← run once on mount only, not on every forgotPasswordMobile change

  // Don't render the form until we've confirmed mobile is present
  if (!forgotPasswordMobile) return null

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the OTP sent to your mobile and choose a new password"
    >
      <ResetPasswordForm />
    </AuthLayout>
  )
}