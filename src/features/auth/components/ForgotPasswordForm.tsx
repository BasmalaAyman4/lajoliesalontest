// ─── ForgotPasswordForm Component ────────────────────────────────────────────
//
//  Step 1 of the forgot-password flow.
//  User enters their mobile number → OTP is sent → navigated to reset page.

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HiPhone } from 'react-icons/hi'
import { Input, Button } from '@/components/shared'
import { useAuth } from '../hooks/useAuth'

const schema = z.object({
  mobile: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\+?[0-9\s\-()]{7,15}$/, 'Enter a valid mobile number'),
})

type FormValues = z.infer<typeof schema>

export default function ForgotPasswordForm() {
  const { forgotPasswordSendOtp, isSendingForgotOtp } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = ({ mobile }: FormValues) => forgotPasswordSendOtp(mobile)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <Input
        {...register('mobile')}
        label="Mobile Number"
        placeholder="Enter your registered mobile"
        autoComplete="tel"
        inputMode="tel"
        error={errors.mobile?.message}
        leftIcon={<HiPhone size={16} />}
      />

      <Button type="submit" loading={isSendingForgotOtp} className="w-full mt-1">
        Send OTP
      </Button>
    </form>
  )
}
