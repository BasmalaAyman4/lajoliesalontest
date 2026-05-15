
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '@/hooks/useAppStore'
import AuthLayout from '../components/AuthLayout'
import OtpForm from '../components/OtpForm'

export default function OtpPage() {
  const navigate = useNavigate()
  const pendingUserId = useAppSelector((s) => s.auth.pendingUserId)

  useEffect(() => {
    if (!pendingUserId) navigate('/login', { replace: true })
  }, [pendingUserId, navigate])

  return (
    <AuthLayout
      title="Verify your phone"
      subtitle="We sent a 6-digit code to your registered number"
    >
      <OtpForm />
    </AuthLayout>
  )
}