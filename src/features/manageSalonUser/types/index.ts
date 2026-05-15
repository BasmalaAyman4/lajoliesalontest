// ─── Salon Specialist Types ───────────────────────────────────────────────────

export interface UserTypeOption {
  id: number
  name: string
}

export interface SalonUser {
  id: number
  name: string
  username: string
  mobile: string
  userType: number
  typeName: string
  nationalId: string
  createdDate: string
  isDeleted: boolean
  isPhoneVerified: boolean
}

export interface CreateSalonUserRequest {
  name: string,
  username: string,
  password: string,
  mobile: string,
  userType: number,
  nationalId: string
}

export interface UpdateSalonUserRequest extends CreateSalonUserRequest {
  id: number
}
export interface ResetPasswordRequest {
  userId: number
  newPassword: string
}