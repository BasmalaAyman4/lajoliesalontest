

import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { useAppSelector } from '@/hooks/useAppStore'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import SchedulePage from '@/pages/SchedulePage'
import LoginPage from '@/features/auth/pages/LoginPage'
import OtpPage from '@/features/auth/pages/OtpPage'
import SalonDataPage from '@/features/salonData/pages/SalonDataPage'
import SalonImagesPage from '@/features/salonImages/pages/SalonImagesPage'
import SalonSpecialistPage from '@/features/salonSpecialist/pages/SalonSpecialistPage'
import SalonBranchPage from '@/features/salonBranch/pages/SalonBranchPage'
import SalonServicesPage from '@/features/salonServices/pages/SalonServicePage'
import ManageSalonUserPage from '@/features/manageSalonUser/pages/SalonUserPage'
import ServiceDiscountPage from '@/features/serviceDiscount/pages/ServiceDiscountPage'
import SalonSchedulePage from '@/features/salonSchedule/pages/SalonSchedulePage'
import SalonReelsPage from '@/features/SalonReelPage/pages/SalonReelPage'
import SalonAppointmentPage from '@/features/salonAppointment/pages/SalonAppointmentPage'
import HowToUsePage from '@/features/howToUse/pages/HowToUsePage'
import ForgetPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/features/auth/pages/ResetPasswordPage'

// ── Guards ─────────────────────────────────────────────────────────────────────

function PrivateRoute() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function PublicRoute() {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  return !isAuthenticated ? <Outlet /> : <Navigate to="/" replace />
}

// ── Router ─────────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  // Public routes (login, otp)
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/otp', element: <OtpPage /> },
      { path: '/forgot-password', element: <ForgetPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Protected routes (dashboard)
  {
    element: <PrivateRoute />,
    children: [
      {
        path: '/',
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'salon-data', element: <SalonDataPage /> },
          { path: 'salon-images', element: <SalonImagesPage /> },
          { path: 'salon-specialists', element: <SalonSpecialistPage /> },
          { path: 'salon-branches', element: <SalonBranchPage /> },
          { path: 'salon-services', element: <SalonServicesPage /> },
          { path: 'manage-salon-user', element: <ManageSalonUserPage /> },
          { path: 'service-discount', element: <ServiceDiscountPage /> },
          { path: 'salon-schedule', element: <SalonSchedulePage /> },
          { path: 'salon-reels', element: <SalonReelsPage /> },
          { path: 'salon-appointments', element: <SalonAppointmentPage /> },
          { path: 'salon-how-to-use', element: <HowToUsePage purposeId={1}/> },

        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
])

export default function AppRouter() {
  return <RouterProvider router={router} />
}