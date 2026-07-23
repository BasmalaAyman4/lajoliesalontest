// ─── Salon Branch Types ───────────────────────────────────────────────────────

export interface TimeValue {
  hour: number
  minute: number
}

export interface BranchChair {
  id: number
  salonBranchId: number
  chairTypeId: number
  chairTypeNameAr: string
  chairTypeNameEn: string
  quantity: number
  isActive: boolean
}

export interface BranchChairInput {
  chairTypeId: number
  quantity: number
  isActive: boolean
}

// Shared fields for both list + detail responses
interface SalonBranchBase {
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
  isMainBranch: boolean
}

/** GET /api/salon/Branch — list row. No `chairs`. */
export interface SalonBranchListItem extends SalonBranchBase {
  isClosed: boolean
}

/** GET /api/salon/Branch/:id — full detail. Has `chairs`; `isClosed` is not
 *  actually present in this endpoint's response per the swagger sample,
 *  so it's kept optional rather than assumed. */
export interface SalonBranch extends SalonBranchBase {
  chairs: BranchChair[]
  isClosed?: boolean
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
  chairs: BranchChairInput[]
}

export interface UpdateBranchRequest extends CreateBranchRequest {
  id: number
}

export interface ChairTypeOption {
  id: number
  name: string
}