// ─── Service Discount API ─────────────────────────────────────────────────────
//
//  GET    /api/salon/ServiceDiscount              → ServiceDiscountListItem[]
//  GET    /api/salon/ServiceDiscount/:id          → ServiceDiscountByIdRaw
//  POST   /api/salon/ServiceDiscount              → void
//  PUT    /api/salon/ServiceDiscount              → void
//  DELETE /api/salon/ServiceDiscount?id=:id       → void
//  POST   /api/salon/ServiceDiscount/stopDetails/:id    → void
//  POST   /api/salon/ServiceDiscount/stopDiscount/:id   → void
//  GET    /api/salon/BasicData/getSalonServiceDropdown  → SalonServiceDropdownOption[]

import { api } from '@/services/api'
import type {
  ServiceDiscount,
  ServiceDiscountListItem,
  ServiceDiscountByIdRaw,
  SalonServiceDropdownOption,
  CreateServiceDiscountRequest,
  UpdateServiceDiscountRequest,
} from '../types'

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Converts "DD-MM-YYYY" (list endpoint) → "YYYY-MM-DD"
 */
function parseDMY(date: string): string {
  // If already ISO / YYYY-MM-DD or ISO datetime, just slice
  if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10)
  // "DD-MM-YYYY"
  const [d, m, y] = date.split('-')
  return `${y}-${m}-${d}`
}

// ── API ───────────────────────────────────────────────────────────────────────

export const serviceDiscountApi = api.injectEndpoints({
  endpoints: (builder) => ({

    // ── GET all discounts ─────────────────────────────────────────────────────
    // The list endpoint does NOT include details, so we immediately fetch each
    // discount by id and merge the details + service names from the dropdown.
    getServiceDiscounts: builder.query<ServiceDiscount[], void>({
      async queryFn(_arg, _api, _extra, baseQuery) {
        // 1. Fetch the list
        const listRes = await baseQuery('/api/salon/ServiceDiscount')
        if (listRes.error) return { error: listRes.error }
        const list = listRes.data as ServiceDiscountListItem[]

        // 2. Fetch the service dropdown (for name resolution)
        const dropdownRes = await baseQuery('/api/salon/BasicData/getSalonServiceDropdown')
        const dropdown: SalonServiceDropdownOption[] =
          dropdownRes.error ? [] : (dropdownRes.data as SalonServiceDropdownOption[])
        const serviceMap = new Map(dropdown.map((s) => [s.id, s.name]))

        // 3. Fetch each discount by id to get its details
        const results = await Promise.all(
          list.map(async (item) => {
            const detailRes = await baseQuery(`/api/salon/ServiceDiscount/${item.id}`)
            const raw = detailRes.error ? null : (detailRes.data as ServiceDiscountByIdRaw)

            const discount: ServiceDiscount = {
              id: item.id,
              dateFrom: parseDMY(item.dateFrom),
              toDate: parseDMY(item.toDate),
              isStopped: item.isStoped,   // map API typo
              isApproved: item.isApproved,
              details: raw
                ? raw.details.map((d) => ({
                    id: d.id,
                    salonServiceId: d.serviceId,
                    serviceNameEn: serviceMap.get(d.serviceId) ?? `Service #${d.serviceId}`,
                    discountValue: d.discountValue,
                    isStopped: d.isStopped,
                  }))
                : [],
            }
            return discount
          }),
        )

        return { data: results }
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'ServiceDiscount' as const, id })),
              { type: 'ServiceDiscount', id: 'LIST' },
            ]
          : [{ type: 'ServiceDiscount', id: 'LIST' }],
    }),

    // ── POST create discount ──────────────────────────────────────────────────
    createServiceDiscount: builder.mutation<void, CreateServiceDiscountRequest>({
      query: (body) => ({
        url: '/api/salon/ServiceDiscount',
        method: 'POST',
        body,
      }),
      // Invalidate both the list and the dropdown so details show immediately
      invalidatesTags: [
        { type: 'ServiceDiscount', id: 'LIST' },
        { type: 'Dropdown', id: 'SALON_SERVICES' },
      ],
    }),

    // ── PUT update discount ───────────────────────────────────────────────────
    updateServiceDiscount: builder.mutation<void, UpdateServiceDiscountRequest>({
      query: (body) => ({
        url: '/api/salon/ServiceDiscount',
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ServiceDiscount', id },
        { type: 'ServiceDiscount', id: 'LIST' },
        { type: 'Dropdown', id: 'SALON_SERVICES' },
      ],
    }),

    // ── DELETE discount ───────────────────────────────────────────────────────
    deleteServiceDiscount: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/ServiceDiscount?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ServiceDiscount', id },
        { type: 'ServiceDiscount', id: 'LIST' },
      ],
    }),

    // ── POST stop a single detail line ────────────────────────────────────────
    stopDiscountDetail: builder.mutation<void, number>({
      query: (detailId) => ({
        url: `/api/salon/ServiceDiscount/stopDetails/${detailId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'ServiceDiscount', id: 'LIST' }],
    }),

    // ── POST stop the entire discount ─────────────────────────────────────────
    stopDiscount: builder.mutation<void, number>({
      query: (id) => ({
        url: `/api/salon/ServiceDiscount/stopDiscount/${id}`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'ServiceDiscount', id },
        { type: 'ServiceDiscount', id: 'LIST' },
      ],
    }),

    // ── GET salon service dropdown ────────────────────────────────────────────
    getSalonServiceDropdown: builder.query<SalonServiceDropdownOption[], void>({
      query: () => '/api/salon/BasicData/getSalonServiceDropdown',
      providesTags: [{ type: 'Dropdown', id: 'SALON_SERVICES' }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetServiceDiscountsQuery,
  useCreateServiceDiscountMutation,
  useUpdateServiceDiscountMutation,
  useDeleteServiceDiscountMutation,
  useStopDiscountDetailMutation,
  useStopDiscountMutation,
  useGetSalonServiceDropdownQuery,
} = serviceDiscountApi