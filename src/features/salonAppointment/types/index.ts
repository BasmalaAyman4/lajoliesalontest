// ─── Salon Appointment Types ──────────────────────────────────────────────────

export interface AdditionalService {
  id: number
  salonServiceId: number
  serviceName: string
  price: number
}

export interface SalonAppointment {
  appointmentId: number
  timeFrom: string
  timeTo: string
  day: number
  month: number
  year: number
  serviceName: string
  branchId: number
  branchAddress: string
  statusId: number
  status: string
  payedDeposit: number | null
  clientName: string
  // Pricing
  mainServicePrice: number | null
  expectedTotalPrice: number | null
  additionalServicesTotal: number
  additionalServices: AdditionalService[]
  isPriceRange: boolean
  minPrice: number | null
  maxPrice: number | null
  finalServicePrice: number | null
  isFinalServicePriceRequired: boolean
  paymentConfirmed: boolean
  // QR / Check-in
  qrToken: string | null
  qrTokenCreatedAt: string | null
  qrTokenExpiresAt: string | null
  isQrTokenExpired: boolean
  checkedInAt: string | null
  startedAt: string | null
  finishedAt: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  lastPageNo: number
  totalCount: number
}

export interface AllowedTransition {
  id: number
  name: string
}

export interface ChangeAppointmentStateRequest {
  id: number
  status: number
}

export interface UpdateMainServicePriceRequest {
  price: number
}

export interface UpdateAdditionalServicesRequest {
  items: { salonServiceId: number; price: number }[]
}