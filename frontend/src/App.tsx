import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import NewConsultationPage from './pages/NewConsultationPage'
import ConsultationDetailPage from './pages/ConsultationDetailPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

const CLINICAL_ROLES = ['nurse', 'doctor', 'facility_manager'] as const

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={[...CLINICAL_ROLES]}>
                <Layout><DashboardPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultation/new"
            element={
              <ProtectedRoute allowedRoles={['nurse', 'doctor']}>
                <Layout><NewConsultationPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/consultation/:id"
            element={
              <ProtectedRoute allowedRoles={[...CLINICAL_ROLES]}>
                <Layout><ConsultationDetailPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
