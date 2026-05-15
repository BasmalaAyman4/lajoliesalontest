// ─── Salon Appointment Types ──────────────────────────────────────────────────

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