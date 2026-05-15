// ─── Auth Slice ───────────────────────────────────────────────────────────────
//
//  Manages: token, user info, isAuthenticated, pendingUserId (OTP flow),
//           forgotPasswordMobile (forgot-password OTP flow)
//  Persistence: token, refreshToken AND user stored in localStorage

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, AuthResponse } from '../types'

// ── localStorage keys ─────────────────────────────────────────────────────────
const TOKEN_KEY = 'token'
const REFRESH_KEY = 'refreshToken'
const USER_KEY = 'auth_user'

function persistTokens(token: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(REFRESH_KEY, refreshToken)
}

function persistUser(user: AuthState['user']) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(USER_KEY)
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

function loadUser(): AuthState['user'] {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ── Initial state — rehydrate from localStorage on page refresh ───────────────
const initial: AuthState = {
  user: loadUser(),
  token: localStorage.getItem(TOKEN_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  pendingUserId: null,
  forgotPasswordMobile: null,
}

// ── Slice ─────────────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    /**
     * Called after successful login (isPhoneVerified=true)
     * OR after successful verifyPhone
     */
    setCredentials(state, action: PayloadAction<AuthResponse>) {
      const { token, refreshToken, ...user } = action.payload
      state.user = user
      state.token = token
      state.refreshToken = refreshToken
      state.isAuthenticated = true
      state.pendingUserId = null
      state.forgotPasswordMobile = null
      persistTokens(token, refreshToken)
      persistUser(user)
    },

    /**
     * Called when login returns isPhoneVerified = false.
     * Stores userId so OTP page can use it without asking again.
     */
    setPendingVerification(state, action: PayloadAction<number>) {
      state.pendingUserId = action.payload
      state.isAuthenticated = false
    },

    /**
     * Called after successful token refresh.
     * Only updates token fields, keeps user info intact.
     */
    tokenRefreshed(state, action: PayloadAction<AuthResponse>) {
      const { token, refreshToken, ...user } = action.payload
      state.token = token
      state.refreshToken = refreshToken
      if (user && Object.keys(user).length > 0) {
        state.user = user
        persistUser(user)
      }
      persistTokens(token, refreshToken)
    },

    /**
     * Called after forgotPasswordSendOtp succeeds.
     * Stores mobile so the reset page can use it without asking again.
     */
    setForgotPasswordMobile(state, action: PayloadAction<string>) {
      state.forgotPasswordMobile = action.payload
    },

    /**
     * Clears the forgot-password mobile once the flow is complete or cancelled.
     */
    clearForgotPasswordMobile(state) {
      state.forgotPasswordMobile = null
    },

    /** Logout — clear everything */
    logout(state) {
      state.user = null
      state.token = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.pendingUserId = null
      state.forgotPasswordMobile = null
      clearTokens()
    },
  },
})

export const {
  setCredentials,
  setPendingVerification,
  tokenRefreshed,
  setForgotPasswordMobile,
  clearForgotPasswordMobile,
  logout,
} = authSlice.actions
export default authSlice.reducer
