// ─── Salon Feature Types ──────────────────────────────────────────────────────

export interface SalonData {
  nameAr: string
  nameEn: string
  telephone: string
  ownerName: string
  taxCardNo: string
  commertialRecordNo: string
  mainOfficeAddress: string
  aboutSalonAr: string | null
  aboutSalonEn: string | null
  discriptionAr: string | null
  discriptionEn: string | null
  hijabSection: boolean
  childrenNotAllowed: boolean
  menWorker: boolean
  logoUrl?: string
  bannerUrl?: string
  isLogoApproved: boolean
  isBannerApproved: boolean
}

export interface UpdateSalonRequest {
  nameAr: string
  nameEn: string
  telephone: string
  mainOfficeAddress: string
  aboutSalonAr: string
  aboutSalonEn: string
  discriptionAr: string
  discriptionEn: string
  hijabSection: boolean
  childrenNotAllowed: boolean
  menWorker: boolean
}
export interface UpdateLogoRequest {
  logo: File
}
export interface UpdateBannerRequest {
  banner: File
}