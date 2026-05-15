import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type {
  LoginRequest,
  AuthResponse,
  RefreshTokenRequest,
  SendOtpRequest,
  VerifyPhoneRequest,
  ForgotPasswordSendOtpRequest,
  ForgotPasswordResetRequest,
  ChangePasswordRequest,
} from '../types'
import type { RootState } from '@/store'

const BASE_URL = import.meta.env.VITE_API_URL

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAuth/login',
        method: 'POST',
        body,
      }),
    }),

    refreshToken: builder.mutation<AuthResponse, RefreshTokenRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAuth/refreshToken',
        method: 'POST',
        body,
      }),
    }),

    sendOtp: builder.mutation<boolean, SendOtpRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAuth/sendOtp',
        method: 'POST',
        body,
      }),
    }),

    verifyPhone: builder.mutation<AuthResponse, VerifyPhoneRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAuth/verifyPhone',
        method: 'POST',
        body,
      }),
    }),

    // ── Forgot Password ──────────────────────────────────────────────────────

    forgotPasswordSendOtp: builder.mutation<boolean, ForgotPasswordSendOtpRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAuth/forgotPassword/sendOtp',
        method: 'POST',
        body,
      }),
    }),

    forgotPasswordReset: builder.mutation<boolean, ForgotPasswordResetRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAuth/forgotPassword/reset',
        method: 'POST',
        body,
      }),
    }),

    // ── Change Password (authenticated) ─────────────────────────────────────

    changePassword: builder.mutation<boolean, ChangePasswordRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAuth/changePassword',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useLoginMutation,
  useRefreshTokenMutation,
  useSendOtpMutation,
  useVerifyPhoneMutation,
  useForgotPasswordSendOtpMutation,
  useForgotPasswordResetMutation,
  useChangePasswordMutation,
} = authApi