// ─── LoginForm Component ──────────────────────────────────────────────────────

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HiUser, HiLockClosed, HiEye, HiEyeOff } from 'react-icons/hi'
import { Input, Button } from '@/components/shared'
import { useAuth } from '../hooks/useAuth'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormValues = z.infer<typeof schema>

export default function LoginForm() {
  const { login, isLoginLoading } = useAuth()
  const [showPass, setShowPass] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = (values: FormValues) => login(values)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        {...register('username')}
        label="Mobile Number"
        placeholder="Enter your Mobile Number"
        autoComplete="username"
        error={errors.username?.message}
        leftIcon={<HiUser size={16} />}
      />

      <div className="flex flex-col gap-1">
        <Input
          {...register('password')}
          label="Password"
          type={showPass ? 'text' : 'password'}
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          leftIcon={<HiLockClosed size={16} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <HiEyeOff size={16} /> : <HiEye size={16} />}
            </button>
          }
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <Button type="submit" loading={isLoginLoading} className="w-full mt-1">
        Sign In
      </Button>
    </form>
  )
}
