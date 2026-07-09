// ─── Branch Chair Types ───────────────────────────────────────────────────────

export interface ChairTypeOption {
  id: number
  name: string
}

export interface BranchOption {
  id: number
  name: string
}

export interface BranchChair {
  id: number
  salonBranchId: number
  chairTypeId: number
  quantity: number
  isActive: boolean
}

export interface CreateBranchChairRequest {
  salonBranchId: number
  chairTypeId: number
  quantity: number
  isActive: boolean
}

// PUT only accepts these three fields — branch/chair type are immutable after creation
export interface UpdateBranchChairRequest {
  id: number
  quantity: number
  isActive: boolean
}