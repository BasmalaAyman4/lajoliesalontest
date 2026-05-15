// ─── Salon Specialist Types ───────────────────────────────────────────────────

export interface JobOption {
  id: number
  name: string
}

export interface SalonSpecialist {
  id: number
  jobId: number
  jobName: string       // returned directly by the API — no client-side lookup needed
  imageUrl?: string
  isImageApproved: boolean
  nameAr: string
  nameEn: string
  brief: string
}

export interface CreateSpecialistRequest {
  jobId: number
  nameAr: string
  nameEn: string
  brief: string
}

export interface UpdateSpecialistRequest extends CreateSpecialistRequest {
  id: number
}