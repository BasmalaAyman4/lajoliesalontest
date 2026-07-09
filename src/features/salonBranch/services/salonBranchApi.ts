// ─── Salon Branch API ─────────────────────────────────────────────────────────
//
//  GET    /api/salon/Branch         → SalonBranchListItem[]  (no chairs)
//  GET    /api/salon/Branch/:id     → SalonBranch             (with chairs)
//  POST   /api/salon/Branch         → number (new id)
//  PUT    /api/salon/Branch         → void
//  DELETE /api/salon/Branch/:id     → void

import { api } from '@/services/api'
import type {
  SalonBranch,
  SalonBranchListItem,
  CreateBranchRequest,
  UpdateBranchRequest,
  ChairTypeOption,
} from '../types'

export const salonBranchApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET all branches (list — no chairs) ─────────────────────────────────
    getSalonBranches: builder.query<SalonBranchListItem[], void>({
      query: () => '/api/salon/Branch',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalonBranch' as const, id })),
              { type: 'SalonBranch', id: 'LIST' },
            ]
          : [{ type: 'SalonBranch', id: 'LIST' }],
    }),

    // ── GET single branch by id (detail — includes chairs) ──────────────────
    getSalonBranchById: builder.query<SalonBranch, number>({
      query: (id) => `/api/salon/Branch/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SalonBranch', id }],
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

    // ── GET chair type dropdown ──────────────────────────────────────────────
    getChairTypeDropdown: builder.query<ChairTypeOption[], void>({
      query: () => '/api/salon/BasicData/getChairTypeDropdown',
      providesTags: [{ type: 'ChairType', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonBranchesQuery,
  useGetSalonBranchByIdQuery,
  useCreateSalonBranchMutation,
  useUpdateSalonBranchMutation,
  useDeleteSalonBranchMutation,
  useGetChairTypeDropdownQuery,
} = salonBranchApi