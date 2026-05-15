// ─── Salon Specialist API ─────────────────────────────────────────────────────
//
//  GET    /api/salon/SalonSpecialist                         → SalonSpecialist[]
//  POST   /api/salon/SalonSpecialist                         → number (new id)
//  PUT    /api/salon/SalonSpecialist                         → void
//  DELETE /api/salon/SalonSpecialist/:id                     → void
//  POST   /api/salon/SalonSpecialist/addSalonSpecialistImage → void
//  GET    /api/salon/BasicData/getJobsDropdown               → JobOption[]

import { api } from '@/services/api'
import type {
  SalonSpecialist,
  CreateSpecialistRequest,
  UpdateSpecialistRequest,
  JobOption,
} from '../types'

export const salonSpecialistApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET all specialists ─────────────────────────────────────────────────
    getSalonSpecialists: builder.query<SalonSpecialist[], void>({
      query: () => '/api/salon/SalonSpecialist',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalonSpecialist' as const, id })),
              { type: 'SalonSpecialist', id: 'LIST' },
            ]
          : [{ type: 'SalonSpecialist', id: 'LIST' }],
    }),

    // ── POST create specialist → returns new specialist id ──────────────────
    createSalonSpecialist: builder.mutation<number, CreateSpecialistRequest>({
      query: (body) => ({
        url: '/api/salon/SalonSpecialist',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SalonSpecialist', id: 'LIST' }],
    }),

    // ── PUT update specialist ───────────────────────────────────────────────
    updateSalonSpecialist: builder.mutation<void, UpdateSpecialistRequest>({
      query: (body) => ({
        url: '/api/salon/SalonSpecialist',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'SalonSpecialist', id }],
    }),

    // ── DELETE specialist by id ─────────────────────────────────────────────
    deleteSalonSpecialist: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/SalonSpecialist/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'SalonSpecialist', id }],
    }),

    // ── POST upload specialist image ────────────────────────────────────────
    uploadSpecialistImage: builder.mutation<void, { specialistId: number; file: File }>({
      query: ({ specialistId, file }) => {
        const body = new FormData()
        body.append('SpecialistId', String(specialistId))
        body.append('SpecialistPicture', file)
        return {
          url: '/api/salon/SalonSpecialist/addSalonSpecialistImage',
          method: 'POST',
          body,
        }
      },
      invalidatesTags: (_result, _error, { specialistId }) => [
        { type: 'SalonSpecialist', id: specialistId },
      ],
    }),

    // ── GET jobs dropdown ───────────────────────────────────────────────────
    getJobsDropdown: builder.query<JobOption[], void>({
      query: () => '/api/salon/BasicData/getJobsDropdown',
      providesTags: [{ type: 'Dropdown', id: 'JOBS' }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonSpecialistsQuery,
  useCreateSalonSpecialistMutation,
  useUpdateSalonSpecialistMutation,
  useDeleteSalonSpecialistMutation,
  useUploadSpecialistImageMutation,
  useGetJobsDropdownQuery,
} = salonSpecialistApi