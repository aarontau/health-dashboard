import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import OfflineBanner from './OfflineBanner'

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  const navLink = (to: string, label: string, icon: string) => {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={`flex flex-col items-center gap-0.5 text-xs font-medium px-4 py-2 rounded-lg transition-colors ${
          active ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <span className="text-xl">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <OfflineBanner />
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-brand-600 text-lg tracking-tight">HealthDash</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom navigation — mobile first */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-2xl mx-auto flex justify-around py-2">
          {navLink('/dashboard', 'Today', '📋')}
          {navLink('/referrals', 'Referrals', '🔀')}
          {navLink('/consultation/new', 'New', '➕')}
        </div>
      </nav>
    </div>
  )
}
