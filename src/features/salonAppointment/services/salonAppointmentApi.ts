// ─── Salon Appointment API ────────────────────────────────────────────────────
//
//  GET    /api/salon/SalonAppointment?pageNo=1&pageSize=20&search=  → PaginatedResponse<SalonAppointment>
//  GET    /api/salon/SalonAppointment/getAllowedTransitions/:id      → AllowedTransition[]
//  POST   /api/salon/SalonAppointment/changeAppointmentState        → void

import { api } from '@/services/api'
import type {
  SalonAppointment,
  PaginatedResponse,
  AllowedTransition,
  ChangeAppointmentStateRequest,
} from '../types'

export const salonAppointmentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET paginated appointments (with optional server-side search) ────────
    getSalonAppointments: builder.query<
      PaginatedResponse<SalonAppointment>,
      { pageNo: number; pageSize: number; search?: string }
    >({
      query: ({ pageNo, pageSize, search }) => {
        const params = new URLSearchParams({
          pageNo: String(pageNo),
          pageSize: String(pageSize),
        })
        if (search?.trim()) params.set('search', search.trim())
        return `/api/salon/SalonAppointment?${params.toString()}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ appointmentId }) => ({
                type: 'SalonAppointment' as const,
                id: appointmentId,
              })),
              { type: 'SalonAppointment', id: 'LIST' },
            ]
          : [{ type: 'SalonAppointment', id: 'LIST' }],
    }),

    // ── GET allowed transitions for an appointment ───────────────────────────
    getAllowedTransitions: builder.query<AllowedTransition[], number>({
      query: (id) =>
        `/api/salon/SalonAppointment/getAllowedTransitions/${id}`,
    }),

    // ── POST change appointment state ────────────────────────────────────────
    changeAppointmentState: builder.mutation<void, ChangeAppointmentStateRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAppointment/changeAppointmentState',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalonAppointment', id },
        { type: 'SalonAppointment', id: 'LIST' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonAppointmentsQuery,
  useGetAllowedTransitionsQuery,
  useChangeAppointmentStateMutation,
} = salonAppointmentApi