import { configureStore } from '@reduxjs/toolkit'
import { api } from '@/services/api'
import { authApi } from '@/features/auth/services/authApi'
import uiReducer from './slices/uiSlice'
import authReducer from '@/features/auth/services/authSlice'

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,         // RTK Query cache (protected routes)
    [authApi.reducerPath]: authApi.reducer, // RTK Query cache (auth endpoints)
    ui: uiReducer,                          // Sidebar, language, dir
    auth: authReducer,                      // Token, user, isAuthenticated
  },
  middleware: (getDefault) =>
    getDefault()
      .concat(api.middleware)
      .concat(authApi.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch