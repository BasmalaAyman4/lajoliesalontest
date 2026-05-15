// ─── Service Discount Types ───────────────────────────────────────────────────

export interface SalonServiceDropdownOption {
  id: number
  name: string
}

// ── List (GET /api/salon/ServiceDiscount) ─────────────────────────────────────
// API returns: { id, dateFrom (DD-MM-YYYY), toDate (DD-MM-YYYY), isStoped, isApproved }
// Note: API typo "isStoped" (one p) — handled in the API transform layer

export interface ServiceDiscountListItem {
  id: number
  dateFrom: string   // "DD-MM-YYYY" as returned by the list endpoint
  toDate: string     // "DD-MM-YYYY" as returned by the list endpoint
  isStoped: boolean  // API typo — one "p"
  isApproved: boolean
}

// ── Detail (GET /api/salon/ServiceDiscount/:id) ───────────────────────────────
// API returns details with serviceId (not salonServiceId), no serviceNameEn

export interface ServiceDiscountDetailRaw {
  id: number
  serviceId: number       // API uses serviceId here (not salonServiceId)
  discountValue: number
  isStopped: boolean
}

export interface ServiceDiscountByIdRaw {
  dateFrom: string        // ISO "2026-04-28T00:00:00"
  toDate: string          // ISO "2026-04-30T00:00:00"
  details: ServiceDiscountDetailRaw[]
}

// ── Normalised shape used throughout the UI ───────────────────────────────────

export interface ServiceDiscountDetail {
  id: number
  salonServiceId: number
  serviceNameEn: string   // resolved from dropdown in the API layer
  discountValue: number
  isStopped: boolean
}

export interface ServiceDiscount {
  id: number
  dateFrom: string        // normalised to "YYYY-MM-DD"
  toDate: string          // normalised to "YYYY-MM-DD"
  isStopped: boolean      // mapped from isStoped
  isApproved: boolean
  details: ServiceDiscountDetail[]  // populated after GET by id
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateDiscountDetailRequest {
  serviceId: number
  discountValue: number
}

export interface CreateServiceDiscountRequest {
  dateFrom: string
  toDate: string
  details: CreateDiscountDetailRequest[]
}

// ── Update ────────────────────────────────────────────────────────────────────

export interface UpdateDiscountDetailRequest {
  salonServiceId: number
  discountValue: number
}

export interface UpdateServiceDiscountRequest {
  id: number
  dateFrom: string
  toDate: string
  details: UpdateDiscountDetailRequest[]
}