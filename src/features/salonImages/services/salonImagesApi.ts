// ─── Salon Images API ─────────────────────────────────────────────────────────
//
//  Injected into the shared `api` instance so it benefits from the
//  auto token-refresh baseQuery already configured there.
//
//  GET    /api/salon/SalonImage          → SalonImage[]
//  POST   /api/salon/SalonImage          → upload new images (FormData)
//  DELETE /api/salon/SalonImage/:id      → remove image by id

import { api } from '@/services/api'
import type { SalonImage } from '../types'

export const salonImagesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET all salon images ────────────────────────────────────────────────
    getSalonImages: builder.query<SalonImage[], void>({
      query: () => '/api/salon/SalonImage',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalonImage' as const, id })),
              { type: 'SalonImage', id: 'LIST' },
            ]
          : [{ type: 'SalonImage', id: 'LIST' }],
    }),

    // ── POST upload new images ──────────────────────────────────────────────
    uploadSalonImages: builder.mutation<void, File[]>({
      query: (files) => {
        const body = new FormData()
        files.forEach((file) => body.append('SalonPictures', file))
        return {
          url: '/api/salon/SalonImage',
          method: 'POST',
          body,
        }
      },
      invalidatesTags: [{ type: 'SalonImage', id: 'LIST' }],
    }),

    // ── DELETE image by id ──────────────────────────────────────────────────
    deleteSalonImage: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/SalonImage/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'SalonImage', id }],
    }),

    // ── PUT sort order ────────────────────────────────────────────────────────────
sortSalonImages: builder.mutation<void, { imageId: number; sortOrder: number }[]>({
  query: (body) => ({
    url: '/api/salon/SalonImage/sort',
    method: 'PUT',
    body,
  }),
  invalidatesTags: [{ type: 'SalonImage', id: 'LIST' }],
}),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonImagesQuery,
  useUploadSalonImagesMutation,
  useDeleteSalonImageMutation,
  useSortSalonImagesMutation,
} = salonImagesApi