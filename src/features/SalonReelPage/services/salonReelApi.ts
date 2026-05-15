// ─── Salon Reel API ───────────────────────────────────────────────────────────

import { api } from '@/services/api'
import type {
  Reel,
  CreateReelRequest,
  ReelDetail,
  ReelsPurposeOption,
  ServiceDropdownOption,
} from '../types'

export const salonReelApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET all reels ────────────────────────────────────────────────────────
    getSalonReels: builder.query<Reel[], void>({
      query: () => '/api/salon/Reals',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalonReel' as const, id })),
              { type: 'SalonReel', id: 'LIST' },
            ]
          : [{ type: 'SalonReel', id: 'LIST' }],
    }),

    // ── POST create reel → returns new reel id ───────────────────────────────
    createSalonReel: builder.mutation<number, CreateReelRequest>({
      query: (body) => ({
        url: '/api/salon/Reals',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SalonReel', id: 'LIST' }],
    }),

    // ── POST upload reel video ───────────────────────────────────────────────
    uploadReelVideo: builder.mutation<void, { reelId: number; file: File }>({
      query: ({ reelId, file }) => {
        const body = new FormData()
        body.append('RealVideo', file)
        return {
          url: `/api/salon/Reals/saveRealVideo?RealId=${reelId}`,
          method: 'POST',
          body,
        }
      },
      invalidatesTags: (_result, _error, { reelId }) => [
        { type: 'SalonReel', id: reelId },
      ],
    }),

    // ── GET single reel by id ────────────────────────────────────────────────
    getReelById: builder.query<ReelDetail, number>({
      query: (id) => `/api/salon/Reals/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SalonReel', id }],
    }),

    // ── DELETE reel by id ────────────────────────────────────────────────────
    deleteSalonReel: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/Reals/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'SalonReel', id }],
    }),

    // ── GET reels purpose dropdown ───────────────────────────────────────────
    getReelsPurposeDropdown: builder.query<ReelsPurposeOption[], void>({
      query: () => '/api/salon/BasicData/getReelsPurposeDropdown',
      providesTags: [{ type: 'Dropdown', id: 'REELS_PURPOSE' }],
      keepUnusedDataFor: 300,
    }),

    // ── GET service dropdown (shared / lazy-friendly) ────────────────────────
    getServiceDropdownForReel: builder.query<ServiceDropdownOption[], void>({
      query: () => '/api/salon/BasicData/getSalonServiceDropdown',
      providesTags: [{ type: 'Dropdown', id: 'SERVICE_REEL' }],
      keepUnusedDataFor: 0,   // always fresh when modal opens
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonReelsQuery,
  useCreateSalonReelMutation,
  useLazyGetReelByIdQuery,
  useUploadReelVideoMutation,
  useDeleteSalonReelMutation,
  useGetReelsPurposeDropdownQuery,
  useGetServiceDropdownForReelQuery,
} = salonReelApi