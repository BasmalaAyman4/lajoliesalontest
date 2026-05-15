// ─── useAuth ──────────────────────────────────────────────────────────────────
//
//  Central hook for all auth actions across the app.
//  Wraps RTK Query mutations + Redux dispatch so pages stay thin.

import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore'
import {
  setCredentials,
  setPendingVerification,
  tokenRefreshed,
  setForgotPasswordMobile,
  clearForgotPasswordMobile,
  logout as logoutAction,
} from '../services/authSlice'
import {
  useLoginMutation,
  useRefreshTokenMutation,
  useSendOtpMutation,
  useVerifyPhoneMutation,
  useForgotPasswordSendOtpMutation,
  useForgotPasswordResetMutation,
  useChangePasswordMutation,
} from '../services/authApi'
import type { LoginRequest } from '../types'

export function useAuth() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const auth = useAppSelector((s) => s.auth)

  const [loginMutation, { isLoading: isLoginLoading }] = useLoginMutation()
  const [refreshTokenMutation] = useRefreshTokenMutation()
  const [sendOtpMutation, { isLoading: isSendingOtp }] = useSendOtpMutation()
  const [verifyPhoneMutation, { isLoading: isVerifying }] = useVerifyPhoneMutation()
  const [forgotPasswordSendOtpMutation, { isLoading: isSendingForgotOtp }] =
    useForgotPasswordSendOtpMutation()
  const [forgotPasswordResetMutation, { isLoading: isResettingPassword }] =
    useForgotPasswordResetMutation()
  const [changePasswordMutation, { isLoading: isChangingPassword }] =
    useChangePasswordMutation()

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (credentials: LoginRequest) => {
    try {
      const result = await loginMutation(credentials).unwrap()

      if (!result.isPhoneVerified) {
        dispatch(setPendingVerification(result.userId))
        await sendOtpMutation({ salonUserId: result.userId }).unwrap()
        navigate('/otp')
        return
      }

      dispatch(setCredentials(result))
      navigate('/')
    } catch {
      toast.error('Invalid username or password')
    }
  }

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const sendOtp = async (userId: number) => {
    try {
      await sendOtpMutation({ salonUserId: userId }).unwrap()
      toast.success('OTP sent successfully')
    } catch {
      toast.error('Failed to send OTP')
    }
  }

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const verifyOtp = async (otp: string) => {
    if (!auth.pendingUserId) return
    try {
      const result = await verifyPhoneMutation({
        salonUserId: auth.pendingUserId,
        otp,
      }).unwrap()
      dispatch(setCredentials(result))
      toast.success('Phone verified!')
      navigate('/salon-how-to-use')
    } catch {
      toast.error('Invalid OTP. Please try again.')
    }
  }

  // ── Forgot Password — Step 1: send OTP to mobile ───────────────────────────
  const forgotPasswordSendOtp = async (mobile: string) => {
    try {
      await forgotPasswordSendOtpMutation({ mobile }).unwrap()
      dispatch(setForgotPasswordMobile(mobile))
      toast.success('OTP sent to your mobile number')
      navigate('/reset-password')
    } catch {
      toast.error('Failed to send OTP. Please check your mobile number.')
    }
  }

  // ── Forgot Password — Step 2: verify OTP + set new password ───────────────
  const forgotPasswordReset = async (otp: string, newPassword: string) => {
    if (!auth.forgotPasswordMobile) return
    try {
      await forgotPasswordResetMutation({
        mobile: auth.forgotPasswordMobile,
        otp,
        newPassword,
      }).unwrap()
      dispatch(clearForgotPasswordMobile())
      toast.success('Password reset successfully. Please sign in.')
      navigate('/login')
    } catch {
      toast.error('Invalid OTP or request expired. Please try again.')
    }
  }

  // ── Resend forgot-password OTP ─────────────────────────────────────────────
  const forgotPasswordResendOtp = async () => {
    if (!auth.forgotPasswordMobile) return
    try {
      await forgotPasswordSendOtpMutation({ mobile: auth.forgotPasswordMobile }).unwrap()
      toast.success('OTP resent successfully')
    } catch {
      toast.error('Failed to resend OTP')
    }
  }

  // ── Change Password (authenticated) ───────────────────────────────────────
  const changePassword = async (
    oldPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    try {
      await changePasswordMutation({ oldPassword, newPassword }).unwrap()
      toast.success('Password changed successfully')
      return true
    } catch {
      toast.error('Current password is incorrect. Please try again.')
      return false
    }
  }

  // ── Refresh token ──────────────────────────────────────────────────────────
  const refreshToken = async () => {
    const currentRefresh = auth.refreshToken
    if (!currentRefresh) {
      dispatch(logoutAction())
      navigate('/login')
      return
    }
    try {
      const result = await refreshTokenMutation({
        refreshToken: currentRefresh,
      }).unwrap()
      dispatch(tokenRefreshed(result))
    } catch {
      dispatch(logoutAction())
      navigate('/login')
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    dispatch(logoutAction())
    navigate('/login')
  }

  return {
    // State
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    pendingUserId: auth.pendingUserId,
    forgotPasswordMobile: auth.forgotPasswordMobile,

    // Loading states
    isLoginLoading,
    isSendingOtp,
    isVerifying,
    isSendingForgotOtp,
    isResettingPassword,
    isChangingPassword,

    // Actions
    login,
    logout,
    sendOtp,
    verifyOtp,
    refreshToken,
    forgotPasswordSendOtp,
    forgotPasswordReset,
    forgotPasswordResendOtp,
    changePassword,
  }
}