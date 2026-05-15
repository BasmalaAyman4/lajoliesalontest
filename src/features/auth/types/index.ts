// ─── Auth Feature Types ───────────────────────────────────────────────────────

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  userId: number
  userName: string
  name: string
  role: number
  token: string
  isPhoneVerified: boolean
  salonName: string
  profileImage: string
  refreshToken: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface SendOtpRequest {
  salonUserId: number
}

export interface VerifyPhoneRequest {
  salonUserId: number
  otp: string
}

// ── Forgot Password ──────────────────────────────────────────────────────────

export interface ForgotPasswordSendOtpRequest {
  mobile: string
}

export interface ForgotPasswordResetRequest {
  mobile: string
  otp: string
  newPassword: string
}

// ── Change Password ──────────────────────────────────────────────────────────

export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
}

export interface AuthState {
  user: Omit<AuthResponse, 'token' | 'refreshToken'> | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  /** userId stored temporarily when isPhoneVerified = false, waiting for OTP */
  pendingUserId: number | null
  /** mobile stored temporarily during forgot-password OTP flow */
  forgotPasswordMobile: string | null
}