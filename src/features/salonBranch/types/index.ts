// ─── Salon Branch Types ───────────────────────────────────────────────────────

export interface TimeValue {
  hour: number
  minute: number
}

export interface SalonBranch {
  id: number
  nameAr: string
  nameEn: string
  lat: string
  long: string
  address: string
  telephone: string
  mobile: string
  managerName: string
openTime: string   // "HH:mm:ss"
  closeTime: string 
}

export interface CreateBranchRequest {
  nameAr: string
  nameEn: string
  lat: string
  long: string
  address: string
  telephone: string
  mobile: string
  managerName: string
openTime: string   // "HH:mm:ss"
  closeTime: string 
}

export interface UpdateBranchRequest extends CreateBranchRequest {
  id: number
}