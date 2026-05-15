// ─── How To Use API ───────────────────────────────────────────────────────────
//
//  GET /api/salon/HowToUse/getByPurposeId/:purposeId?pageNo=1&pageSize=20

import { api } from '@/services/api'
import type { HowToUseListResponse } from '../types'

export const howToUseApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET how-to-use items by purpose id ──────────────────────────────────
    getHowToUseByPurpose: builder.query<
      HowToUseListResponse,
      { purposeId: number; pageNo?: number; pageSize?: number }
    >({
      query: ({ purposeId, pageNo = 1, pageSize = 20 }) =>
        `/api/salon/HowToUse/getByPurposeId/1?pageNo=${pageNo}&pageSize=${pageSize}`,
      providesTags: (_result, _error, { purposeId }) => [
        { type: 'HowToUse' as const, id: purposeId },
        { type: 'HowToUse' as const, id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const { useGetHowToUseByPurposeQuery } = howToUseApi