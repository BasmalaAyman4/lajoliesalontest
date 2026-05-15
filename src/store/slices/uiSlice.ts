import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  sidebarOpen: boolean
  lang: 'en' | 'ar'
  dir: 'ltr' | 'rtl'
}

const initial: UiState = {
  sidebarOpen: true,
  lang: (localStorage.getItem('i18nextLng') as 'en' | 'ar') || 'en',
  dir: localStorage.getItem('i18nextLng') === 'ar' ? 'rtl' : 'ltr',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: initial,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
    setLang(state, action: PayloadAction<'en' | 'ar'>) {
      state.lang = action.payload
      state.dir = action.payload === 'ar' ? 'rtl' : 'ltr'
    },
  },
})

export const { toggleSidebar, setLang } = uiSlice.actions
export default uiSlice.reducer
