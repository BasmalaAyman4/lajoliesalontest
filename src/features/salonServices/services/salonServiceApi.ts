import { api } from '@/services/api'
import type {
  SalonService,
  CreateServiceRequest,
  UpdateServiceRequest,
  CategoryOption,
  ServiceTypeOption,
} from '../types'

export const salonServiceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ── GET all services ──────────────────────────────────────────────────────
    getSalonServices: builder.query<SalonService[], void>({
      query: () => '/api/salon/SalonService',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'SalonService' as const, id })),
              { type: 'SalonService', id: 'LIST' },
            ]
          : [{ type: 'SalonService', id: 'LIST' }],
    }),

    // ── POST create service ───────────────────────────────────────────────────
    createSalonService: builder.mutation<number, CreateServiceRequest>({
      query: (body) => ({
        url: '/api/salon/SalonService',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'SalonService', id: 'LIST' },
        // Refresh dropdown so discount form sees the new service immediately
        { type: 'Dropdown', id: 'SALON_SERVICES' },
        // Also bust the discount list so merged details re-fetch with new service names
        { type: 'ServiceDiscount', id: 'LIST' },
      ],
    }),

    // ── PUT update service ────────────────────────────────────────────────────
    updateSalonService: builder.mutation<void, UpdateServiceRequest>({
      query: (body) => ({
        url: '/api/salon/SalonService',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'SalonService', id },
        // Name may have changed — refresh dropdown and discount list
        { type: 'Dropdown', id: 'SALON_SERVICES' },
        { type: 'ServiceDiscount', id: 'LIST' },
      ],
    }),

    // ── DELETE service ────────────────────────────────────────────────────────
    deleteSalonService: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/SalonService?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'SalonService', id },
        { type: 'SalonService', id: 'LIST' },
        { type: 'Dropdown', id: 'SALON_SERVICES' },
        { type: 'ServiceDiscount', id: 'LIST' },
      ],
    }),

    // ── POST upload service image ─────────────────────────────────────────────
    uploadServiceImage: builder.mutation<void, { serviceId: number; file: File }>({
      query: ({ serviceId, file }) => {
        const body = new FormData()
        body.append('ServiceId', String(serviceId))
        body.append('ServicePicture', file)
        return {
          url: '/api/salon/SalonService/addServiceImage',
          method: 'POST',
          body,
        }
      },
      invalidatesTags: (_result, _error, { serviceId }) => [
        { type: 'SalonService', id: serviceId },
      ],
    }),

    // ── GET service categories dropdown ───────────────────────────────────────
    getServiceCategoryDropdown: builder.query<CategoryOption[], void>({
      query: () => '/api/salon/BasicData/getServiceCategoryDropdown',
      providesTags: [{ type: 'Dropdown', id: 'SERVICE_CATEGORIES' }],
    }),

    // ── GET service types filtered by category ────────────────────────────────
    // Use `skip: !categoryId` at the call site to avoid firing with id = 0
    getServiceTypeByCategoryDropdown: builder.query<ServiceTypeOption[], number>({
      query: (serviceCategoryId) =>
        `/api/salon/BasicData/getServiceTypeByCategoryDropdown?serviceCategoryId=${serviceCategoryId}`,
      providesTags: (_result, _error, serviceCategoryId) => [
        { type: 'Dropdown', id: `SERVICE_TYPES_CAT_${serviceCategoryId}` },
      ],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetSalonServicesQuery,
  useCreateSalonServiceMutation,
  useUpdateSalonServiceMutation,
  useDeleteSalonServiceMutation,
  useUploadServiceImageMutation,
  useGetServiceCategoryDropdownQuery,
  useGetServiceTypeByCategoryDropdownQuery,
} = salonServiceApi