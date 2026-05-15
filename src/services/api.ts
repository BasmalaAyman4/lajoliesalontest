// ─── Base API Service ─────────────────────────────────────────────────────────
//
//  Uses RTK Query's re-authentication flow:
//  If a request returns 401, try refreshing the token once.
//  If refresh also fails, logout the user.

import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/store'
import { tokenRefreshed, logout } from '@/features/auth/services/authSlice'

const BASE_URL =
  import.meta.env.VITE_API_URL ?? 'https://lajolietest.geniussystemtest.com'

// ── Base query with token header ──────────────────────────────────────────────
const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
    headers.set('Accept', 'application/json')
    return headers
  },
})

// ── Wrapper that retries once after refreshing the token ──────────────────────
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)

  if (result.error?.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken

    if (refreshToken) {
      // Try to get a new token
      const refreshResult = await baseQuery(
        {
          url: '/api/salon/SalonAuth/refreshToken',
          method: 'POST',
          body: { refreshToken },
        },
        api,
        extraOptions,
      )

      if (refreshResult.data) {
        api.dispatch(tokenRefreshed(refreshResult.data as Parameters<typeof tokenRefreshed>[0]))
        // Retry the original request with the new token
        result = await baseQuery(args, api, extraOptions)
      } else {
        // Refresh failed — force logout
        api.dispatch(logout())
      }
    } else {
      api.dispatch(logout())
    }
  }

  return result
}

// ── RTK Query API ─────────────────────────────────────────────────────────────
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Schedule', 'Dropdown', 'SalonData', 'SalonImage', 'SalonSpecialist', 'SalonBranch', 'SalonService', 'SalonUser', 'ServiceDiscount', 'SalonSchedule', 'SalonReel', 'SalonAppointment','HowToUse'],
  endpoints: () => ({}),
})