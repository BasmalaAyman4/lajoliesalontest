// ─── Salon Branch API ─────────────────────────────────────────────────────────
//
//  GET    /api/salon/Branch         → SalonBranch[]
//  POST   /api/salon/Branch         → number (new id)
//  PUT    /api/salon/Branch         → void
//  DELETE /api/salon/Branch/:id     → void

import { api } from '@/services/api'
import type { SalonBranch, CreateBranchRequest, UpdateBranchRequest } from '../types'

export const salonBranchApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET all branches ────────────────────────────────────────────────────
    getSalonBranches: builder.query<SalonBranch[], void>({
      query: () => '/api/salon/Branch',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalonBranch' as const, id })),
              { type: 'SalonBranch', id: 'LIST' },
            ]
          : [{ type: 'SalonBranch', id: 'LIST' }],
    }),

    // ── POST create branch → returns new branch id ──────────────────────────
    createSalonBranch: builder.mutation<number, CreateBranchRequest>({
      query: (body) => ({
        url: '/api/salon/Branch',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SalonBranch', id: 'LIST' }],
    }),

    // ── PUT update branch ───────────────────────────────────────────────────
    updateSalonBranch: builder.mutation<void, UpdateBranchRequest>({
      query: (body) => ({
        url: '/api/salon/Branch',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalonBranch', id },
        { type: 'SalonBranch', id: 'LIST' },
      ],
    }),

    // ── DELETE branch by id ─────────────────────────────────────────────────
    deleteSalonBranch: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/Branch/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'SalonBranch', id },
        { type: 'SalonBranch', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonBranchesQuery,
  useCreateSalonBranchMutation,
  useUpdateSalonBranchMutation,
  useDeleteSalonBranchMutation,
} = salonBranchApi