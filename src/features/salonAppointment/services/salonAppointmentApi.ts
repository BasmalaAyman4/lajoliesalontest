// ─── Salon Appointment API ────────────────────────────────────────────────────
//
//  GET    /api/salon/SalonAppointment?pageNo=1&pageSize=20&search=
//  GET    /api/salon/SalonAppointment/:id
//  GET    /api/salon/SalonAppointment/getAllowedTransitions/:id
//  POST   /api/salon/SalonAppointment/changeAppointmentState
//  PUT    /api/salon/SalonAppointment/:id/mainServicePrice
//  PUT    /api/salon/SalonAppointment/:id/additionalServices

import { api } from '@/services/api'
import type {
  SalonAppointment,
  PaginatedResponse,
  AllowedTransition,
  ChangeAppointmentStateRequest,
  UpdateMainServicePriceRequest,
  UpdateAdditionalServicesRequest,
} from '../types'

export const salonAppointmentApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET paginated appointments ───────────────────────────────────────────
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

    // ── GET single appointment by ID (used to refresh qrToken post check-in) ─
    getSalonAppointmentById: builder.query<SalonAppointment, number>({
      query: (id) => `/api/salon/SalonAppointment/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'SalonAppointment', id }],
    }),

    // ── GET allowed transitions ──────────────────────────────────────────────
    getAllowedTransitions: builder.query<AllowedTransition[], number>({
      query: (id) => `/api/salon/SalonAppointment/getAllowedTransitions/${id}`,
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

    // ── PUT update main service price ────────────────────────────────────────
    updateMainServicePrice: builder.mutation<
      void,
      { id: number } & UpdateMainServicePriceRequest
    >({
      query: ({ id, price }) => ({
        url: `/api/salon/SalonAppointment/${id}/mainServicePrice`,
        method: 'PUT',
        body: { price },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalonAppointment', id },
        { type: 'SalonAppointment', id: 'LIST' },
      ],
    }),

    // ── PUT update additional services ───────────────────────────────────────
    updateAdditionalServices: builder.mutation<
      void,
      { id: number } & UpdateAdditionalServicesRequest
    >({
      query: ({ id, items }) => ({
        url: `/api/salon/SalonAppointment/${id}/additionalServices`,
        method: 'PUT',
        body: { items },
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
  useGetSalonAppointmentByIdQuery,   // ← new
  useGetAllowedTransitionsQuery,
  useChangeAppointmentStateMutation,
  useUpdateMainServicePriceMutation,
  useUpdateAdditionalServicesMutation,
} = salonAppointmentApi