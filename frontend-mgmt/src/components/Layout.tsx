import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import type { UserRole } from '../types'

interface NavItem {
  path: string
  label: string
  icon: string
  minRole: UserRole
}

const ROLE_LEVEL: Record<UserRole, number> = {
  nurse: 1, doctor: 2, facility_manager: 3,
  district_officer: 4, provincial_officer: 5,
  national_officer: 6, minister: 7,
}

const NAV_ITEMS: NavItem[] = [
  { path: '/district',  label: 'District',  icon: '🏥', minRole: 'district_officer'   },
  { path: '/province',  label: 'Province',  icon: '🗺️', minRole: 'provincial_officer'  },
  { path: '/national',  label: 'National',  icon: '🇿🇦', minRole: 'national_officer'   },
]

interface Props { children: React.ReactNode; title: string }

export default function Layout({ children, title }: Props) {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const userLevel = user ? ROLE_LEVEL[user.role] : 0
  const visibleNav = NAV_ITEMS.filter(n => userLevel >= ROLE_LEVEL[n.minRole])

  function logout() { clearAuth(); navigate('/login', { replace: true }) }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-white font-bold text-lg tracking-tight">HealthDash</span>
        <p className="text-slate-400 text-xs mt-0.5">Management Portal</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map(item => {
          const active = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User block */}
      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-white text-sm font-medium truncate">{user?.first_name} {user?.last_name}</p>
        <p className="text-slate-400 text-xs capitalize mt-0.5">{user?.role.replace(/_/g, ' ')}</p>
        <button
          onClick={logout}
          className="mt-3 text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-slate-900 shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-slate-900 flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 h-14 flex items-center px-6 gap-4 shrink-0">
          <button
            className="md:hidden text-slate-500 hover:text-slate-900"
            onClick={() => setSidebarOpen(true)}
          >
            ☰
          </button>
          <h1 className="font-semibold text-slate-900 text-lg">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Auto-refreshes every 5 min
            </span>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
