
import AuthLayout from '../components/AuthLayout'
import LoginForm from '../components/LoginForm'

export default function LoginPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your salon dashboard"
    >
      <LoginForm />
    </AuthLayout>
  )
}