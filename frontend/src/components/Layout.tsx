import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import OfflineBanner from './OfflineBanner'

interface Props {
  children: React.ReactNode
}

function avatarUrl(id: number) {
  const gender = id % 2 === 0 ? 'men' : 'women'
  const index  = Math.max(1, (id * 7) % 70)
  return `https://randomuser.me/api/portraits/${gender}/${index}.jpg`
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
    const active = location.pathname === to || location.pathname.startsWith(to + '/')
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <OfflineBanner />
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🏥</span>
            <span className="font-extrabold text-brand-600 text-lg tracking-tight">HealthDash</span>
          </div>

          {/* User area */}
          <div className="flex items-center gap-2.5">
            {user && (
              <img
                src={avatarUrl(user.id)}
                alt={user.first_name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-100 shadow-sm"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.first_name + '+' + user.last_name)}&background=2563eb&color=fff&size=80`
                }}
              />
            )}
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-semibold text-gray-800">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-[11px] text-gray-400 capitalize">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-1 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:border-red-200 hover:bg-red-50"
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

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
        <div className="max-w-2xl mx-auto flex justify-around py-2">
          {navLink('/dashboard',        'Today',     '📋')}
          {navLink('/referrals',        'Referrals', '🔀')}
          {navLink('/consultation/new', 'New',       '➕')}
        </div>
      </nav>

    </div>
  )
}
