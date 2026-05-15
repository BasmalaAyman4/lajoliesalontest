// ─── Salon Service Types ──────────────────────────────────────────────────────

export interface CategoryOption {
  id: number
  name: string
}

export interface ServiceTypeOption {
  id: number
  name: string
}

export interface SalonService {
  id: number
  serviceCategoriesId: number
  serviceCategoryName: string
  serviceTypeId: number
  serviceTypeName: string
  codeKey: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  isPriceRange: boolean
  price?: number
  minPrice?: number
  maxPrice?: number
  priceNoteAr?: string
  priceNoteEn?: string
  isHomeService: boolean
  isInSalonService: boolean
  isFeatured: boolean
  isActive: boolean
  sortOrder: number
  imageUrl?: string
  isImageApproved: boolean
}

export interface CreateServiceRequest {
  serviceCategoriesId: number
  serviceTypeId: number
  codeKey: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  isPriceRange: boolean
  price?: number
  minPrice?: number
  maxPrice?: number
  priceNoteAr?: string
  priceNoteEn?: string
  isHomeService: boolean
  isInSalonService: boolean
  isFeatured: boolean
  isActive: boolean
  sortOrder: number
}

export interface UpdateServiceRequest extends CreateServiceRequest {
  id: number
}