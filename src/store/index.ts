import { configureStore, combineReducers, type Action } from '@reduxjs/toolkit'
import { api } from '@/services/api'
import { authApi } from '@/features/auth/services/authApi'
import uiReducer from './slices/uiSlice'
import authReducer, { logout } from '@/features/auth/services/authSlice'

const appReducer = combineReducers({
  [api.reducerPath]: api.reducer,         // RTK Query cache (protected routes)
  [authApi.reducerPath]: authApi.reducer, // RTK Query cache (auth endpoints)
  ui: uiReducer,                          // Sidebar, language, dir
  auth: authReducer,                      // Token, user, isAuthenticated
})

const rootReducer = (state: any, action: AnyAction) => {
  if (action.type === logout.type) {
    // Keep UI state so language/sidebar settings are not reset
    // Wipe everything else (clears auth and RTK query caches)
    state = { ui: state?.ui } as any
  }
  return appReducer(state, action)
}

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault()
      .concat(api.middleware)
      .concat(authApi.middleware),
})

export type RootState = ReturnType<typeof appReducer>
export type AppDispatch = typeof store.dispatch