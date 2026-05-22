import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import type { UserRole } from '../types'

interface Props {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { token, user } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        You do not have permission to view this page.
      </div>
    )
  }
  return <>{children}</>
}
