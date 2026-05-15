// ─── ForgotPasswordPage ───────────────────────────────────────────────────────
//
//  Step 1: user enters mobile → OTP is dispatched → navigates to reset page.

import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import ForgotPasswordForm from '../components/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your mobile number and we'll send you an OTP"
    >
      <ForgotPasswordForm />

      <p className="text-center text-sm text-[var(--text-muted)]">
        Remember your password?{' '}
        <Link
          to="/login"
          className="text-[var(--accent)] hover:underline font-medium"
        >
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
