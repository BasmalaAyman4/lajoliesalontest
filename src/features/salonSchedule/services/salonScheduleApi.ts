// ─── Salon Schedule API ───────────────────────────────────────────────────────
//
//  GET    /api/salon/SalonSchedule         → SalonSchedule[]
//  POST   /api/salon/SalonSchedule         → number (new id)
//  PUT    /api/salon/SalonSchedule         → void
//  DELETE /api/salon/SalonSchedule/:id     → void
//  GET    /api/salon/BasicData/getSalonServiceDropdown → DropdownItem[]
//  GET    /api/salon/BasicData/getBranchDropdown       → DropdownItem[]

import { api } from '@/services/api'
import type {
  SalonSchedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  DropdownItem,
} from '../types'

export const salonScheduleApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET all schedules ───────────────────────────────────────────────────
    getSalonSchedules: builder.query<SalonSchedule[], void>({
      query: () => '/api/salon/SalonSchedule',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalonSchedule' as const, id })),
              { type: 'SalonSchedule', id: 'LIST' },
            ]
          : [{ type: 'SalonSchedule', id: 'LIST' }],
    }),

    // ── POST create schedule ────────────────────────────────────────────────
    createSalonSchedule: builder.mutation<number, CreateScheduleRequest>({
      query: (body) => ({
        url: '/api/salon/SalonSchedule',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SalonSchedule', id: 'LIST' }],
    }),

    // ── PUT update schedule ─────────────────────────────────────────────────
    updateSalonSchedule: builder.mutation<void, UpdateScheduleRequest>({
      query: (body) => ({
        url: '/api/salon/SalonSchedule',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalonSchedule', id },
        { type: 'SalonSchedule', id: 'LIST' },
      ],
    }),

    // ── DELETE schedule by id ───────────────────────────────────────────────
    deleteSalonSchedule: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/SalonSchedule/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'SalonSchedule', id },
        { type: 'SalonSchedule', id: 'LIST' },
      ],
    }),

 // ── GET service dropdown ────────────────────────────────────────────────
getSalonServiceDropdown: builder.query<DropdownItem[], void>({
  query: () => '/api/salon/BasicData/getSalonServiceDropdown',
  providesTags: [
    { type: 'SalonSchedule', id: 'SERVICE_DROPDOWN' },
  ],
  keepUnusedDataFor: 0,   // ← don't cache when modal is closed
}),

// ── GET branch dropdown ─────────────────────────────────────────────────
getBranchDropdown: builder.query<DropdownItem[], void>({
  query: () => '/api/salon/BasicData/getBranchDropdown',
  providesTags: [
    { type: 'SalonSchedule', id: 'BRANCH_DROPDOWN' },
    { type: 'SalonBranch', id: 'LIST' },   // ← invalidated when branches change
  ],
  keepUnusedDataFor: 0,   // ← don't cache when modal is closed
}),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonSchedulesQuery,
  useCreateSalonScheduleMutation,
  useUpdateSalonScheduleMutation,
  useDeleteSalonScheduleMutation,
  useGetSalonServiceDropdownQuery,
  useGetBranchDropdownQuery,
} = salonScheduleApi