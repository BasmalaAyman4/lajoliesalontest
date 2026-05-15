// ─── Salon Reel Types ─────────────────────────────────────────────────────────

export interface Reel {
  id: number
  title: string
  description: string
  reelsPurposeId: number
  salonServiceId: number | null
  createdDate: string
  isApproved: boolean
  isStoped: boolean
}

export interface ReelDetail extends Reel {
  imageThumbnailUrl?: string
  videoUrl?: string
}

export interface CreateReelRequest {
  title: string
  description: string
  reelsPurposeId: number
  salonServiceId: number | null
}

export interface ReelsPurposeOption {
  id: number
  name: string
}

export interface ServiceDropdownOption {
  id: number
  name: string
}