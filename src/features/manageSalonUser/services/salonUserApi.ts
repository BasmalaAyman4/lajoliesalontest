import { api } from '@/services/api'
import type {
  SalonUser,
  CreateSalonUserRequest,
  UpdateSalonUserRequest,
  UserTypeOption,
  ResetPasswordRequest
} from '../types'

export const salonUserApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET all users ─────────────────────────────────────────────────
    getSalonUsers: builder.query<SalonUser[], void>({
      query: () => '/api/salon/ManageSalonUser',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalonUser' as const, id })),
              { type: 'SalonUser', id: 'LIST' },
            ]
          : [{ type: 'SalonUser', id: 'LIST' }],
    }),

    // ── POST create user → returns new user id ──────────────────
    createSalonUser: builder.mutation<number, CreateSalonUserRequest>({
      query: (body) => ({
        url: '/api/salon/ManageSalonUser',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'SalonUser', id: 'LIST' }],
    }),

    // ── PUT update user ───────────────────────────────────────────────
    updateSalonUser: builder.mutation<void, UpdateSalonUserRequest>({
      query: (body) => ({
        url: '/api/salon/ManageSalonUser',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'SalonUser', id }],
    }),

    // ── DELETE user by id ─────────────────────────────────────────────
    deleteSalonUser: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/ManageSalonUser/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'SalonUser', id }],
    }),


    // ── GET user type dropdown ───────────────────────────────────────────────────
    getUserTypeDropdown: builder.query<UserTypeOption[], void>({
      query: () => '/api/salon/BasicData/getSalonUserTypeDropdown',
      providesTags: [{ type: 'Dropdown', id: 'USERTYPES' }],
    }),

       // ── POST reset password ───────────────────────────────────────────────
    resetSalonUserPassword: builder.mutation<void, ResetPasswordRequest>({
      query: (body) => ({
        url: '/api/salon/SalonAuth/resetPassword',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonUsersQuery,
  useCreateSalonUserMutation,
  useUpdateSalonUserMutation,
  useDeleteSalonUserMutation,
  useGetUserTypeDropdownQuery,
  useResetSalonUserPasswordMutation,
} = salonUserApi