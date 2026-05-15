// ─── How To Use Types ─────────────────────────────────────────────────────────

export interface HowToUseItem {
  id: number
  title: string
  description: string
  howToUsePurposeId: number
  howToUsePurposeName: string
  howToUseMediaTypeId: 1 | 2          // 1 = Image, 2 = Video
  howToUseMediaTypeName: string
  imageUrl: string | null
  videoUrl: string | null
  sortOrder: number
  createdDate: string                  // "DD-MM-YYYY"
}

export interface HowToUseListResponse {
  data: HowToUseItem[]
  lastPageNo: number
  totalCount: number
}
