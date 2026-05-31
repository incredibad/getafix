import { NavLink, useNavigate } from 'react-router-dom'
import { Calendar, Trophy, Users, Settings, LogOut, LogIn, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import AppLogo from './AppLogo'

const NAV_PUBLIC = [
  { to: '/fixtures', icon: Calendar, label: 'Fixtures' },
  { to: '/tables',   icon: Trophy,   label: 'Tables' },
]
const NAV_AUTH = [
  { to: '/teams',    icon: Users,    label: 'Teams' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/login') }

  // Desktop sidebar shows all nav; mobile drawer shows only auth items
  const desktopNav = user ? [...NAV_PUBLIC, ...NAV_AUTH] : NAV_PUBLIC
  const drawerNav  = user ? NAV_AUTH : []

  const drawerContent = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <AppLogo size="md" />
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {drawerNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-600/20 text-green-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        ) : (
          <button
            onClick={() => { setOpen(false); navigate('/login') }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-green-400 hover:bg-green-400/10 transition-colors"
          >
            <LogIn size={18} />
            Log in
          </button>
        )}
      </div>
    </>
  )

  const desktopContent = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <AppLogo size="md" />
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {desktopNav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-green-600/20 text-green-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-green-400 hover:bg-green-400/10 transition-colors"
          >
            <LogIn size={18} />
            Log in
          </button>
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 h-14 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <AppLogo size="sm" />
        <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-white p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute left-0 top-14 bottom-0 w-64 flex flex-col"
            style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            {drawerContent}
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {NAV_PUBLIC.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-green-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <Icon size={22} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>

      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-56 flex-shrink-0 h-screen sticky top-0"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        {desktopContent}
      </aside>
    </>
  )
}
