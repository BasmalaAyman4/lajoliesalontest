import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Toaster } from 'sonner'
import './index.css'
import './lib/i18n'  // initialise i18next before rendering
import { store } from './store'
import AppRouter from './routes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AppRouter />
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          },
        }}
      />
    </Provider>
  </StrictMode>,
)
