// ─── Basic Data Dropdowns ─────────────────────────────────────────────────────

import { api } from '@/services/api'
import type { ChairTypeOption, BranchOption, BranchChair, CreateBranchChairRequest, UpdateBranchChairRequest } from '../types'

export const branchChairApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getChairTypeDropdown: builder.query<ChairTypeOption[], void>({
      query: () => '/api/salon/BasicData/getChairTypeDropdown',
      providesTags: [{ type: 'ChairTypeDropdown', id: 'LIST' }],
    }),
    getBranchDropdown: builder.query<BranchOption[], void>({
      query: () => '/api/salon/BasicData/getBranchDropdown',
      providesTags: [{ type: 'BranchDropdown', id: 'LIST' }],
    }),

   getBranchChairs: builder.query<BranchChair[], void>({
      query: () => '/api/salon/BranchChair/branch',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'BranchChair' as const, id })),
              { type: 'BranchChair', id: 'LIST' },
            ]
          : [{ type: 'BranchChair', id: 'LIST' }],
    }),

    createBranchChair: builder.mutation<number, CreateBranchChairRequest>({
      query: (body) => ({
        url: '/api/salon/BranchChair',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'BranchChair', id: 'LIST' }],
    }),

    // Optimistic update — matches the Points & Rewards toggle pattern:
    // patch the cache immediately, roll back on failure.
    updateBranchChair: builder.mutation<void, UpdateBranchChairRequest>({
      query: (body) => ({
        url: '/api/salon/BranchChair',
        method: 'PUT',
        body,
      }),
      async onQueryStarted({ id, quantity, isActive }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          branchChairApi.util.updateQueryData('getBranchChairs', undefined, (draft) => {
            const row = draft.find((r) => r.id === id)
            if (row) {
              row.quantity = quantity
              row.isActive = isActive
            }
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'BranchChair', id },
        { type: 'BranchChair', id: 'LIST' },
      ],
    }),

    deleteBranchChair: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/BranchChair/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'BranchChair', id },
        { type: 'BranchChair', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const { 
    useGetChairTypeDropdownQuery,
    useGetBranchDropdownQuery,  
    useGetBranchChairsQuery,
    useCreateBranchChairMutation,
    useUpdateBranchChairMutation,
    useDeleteBranchChairMutation, } = branchChairApi