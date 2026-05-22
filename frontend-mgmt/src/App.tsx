import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage      from './pages/LoginPage'
import DistrictPage   from './pages/DistrictPage'
import ProvincePage   from './pages/ProvincePage'
import NationalPage   from './pages/NationalPage'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

const MGMT_ROLES = ['district_officer','provincial_officer','national_officer','minister'] as const

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/district"
            element={
              <ProtectedRoute allowedRoles={[...MGMT_ROLES]}>
                <DistrictPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/province"
            element={
              <ProtectedRoute allowedRoles={['provincial_officer','national_officer','minister']}>
                <ProvincePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/national"
            element={
              <ProtectedRoute allowedRoles={['national_officer','minister']}>
                <NationalPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/national" replace />} />
          <Route path="*" element={<Navigate to="/national" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
