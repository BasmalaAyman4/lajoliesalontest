// ─── Salon API ────────────────────────────────────────────────────────────────
//
//  Injected into the shared `api` instance so every endpoint benefits from the
//  auto token-refresh baseQuery already configured there.
//
//  GET  /api/salon/SalonData                  → SalonData
//  PUT  /api/salon/SalonData                  → SalonData (updated)
//  POST /api/salon/SalonImage/UpdateLogo      → void  (multipart, field: "logo")
//  POST /api/salon/SalonImage/UpdateBanner    → void  (multipart, field: "banner")

import { api } from '@/services/api'
import type {
  SalonData,
  UpdateSalonRequest,
  UpdateLogoRequest,
  UpdateBannerRequest,
} from '../types'

export const salonApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── Data ──────────────────────────────────────────────────────────────────
    getSalonData: builder.query<SalonData, void>({
      query: () => '/api/salon/SalonData',
      providesTags: ['SalonData'],
    }),

    updateSalonData: builder.mutation<SalonData, UpdateSalonRequest>({
      query: (body) => ({
        url: '/api/salon/SalonData',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['SalonData'],
    }),

    // ── Images ────────────────────────────────────────────────────────────────
    updateSalonLogo: builder.mutation<void, UpdateLogoRequest>({
      query: ({ logo }) => {
        const formData = new FormData()
        formData.append('logo', logo)
        return {
          url: '/api/salon/SalonImage/UpdateLogo',
          method: 'POST',
          body: formData,
          // Do NOT set Content-Type — the browser sets the correct
          // multipart/form-data boundary automatically when body is FormData.
          formData: true,
        }
      },
      invalidatesTags: ['SalonData'],
    }),

    updateSalonBanner: builder.mutation<void, UpdateBannerRequest>({
      query: ({ banner }) => {
        const formData = new FormData()
        formData.append('banner', banner)
        return {
          url: '/api/salon/SalonImage/UpdateBanner',
          method: 'POST',
          body: formData,
          formData: true,
        }
      },
      invalidatesTags: ['SalonData'],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonDataQuery,
  useUpdateSalonDataMutation,
  useUpdateSalonLogoMutation,
  useUpdateSalonBannerMutation,
} = salonApi