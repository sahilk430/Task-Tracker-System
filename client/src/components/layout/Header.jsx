import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, ChevronDown, Menu, Moon, Sun } from 'lucide-react'
import Avatar from '../ui/Avatar'
import NotificationBell from './NotificationBell'
import { useUser, useLogout } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { ROLE_LABELS } from '../../utils/constants'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/users':     'Manage Users',
  '/members':   'Team Members',
  '/websites':  'Websites',
  '/tasks':     'Tasks',
  '/reports':   'Reports',
}

// Detail pages (/tasks/:id, /members/:id, …) fall back to their section title
const DETAIL_TITLES = { members: 'Member Dashboard', tasks: 'Task Details', websites: 'Website Details' }
const pageTitle = (pathname) =>
  PAGE_TITLES[pathname] || DETAIL_TITLES[pathname.split('/')[1]] || 'SEO Tracker'

export default function Header({ onMenuClick }) {
  const [open, setOpen] = useState(false)
  const user      = useUser()
  const logout    = useLogout()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [theme, toggleTheme] = useTheme()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenuClick} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100" aria-label="Open menu">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 truncate">{pageTitle(location.pathname)}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
      <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <NotificationBell />
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Avatar name={user?.name} src={user?.avatarUrl} size="sm" />
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-500">{ROLE_LABELS[user?.role]}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </header>
  )
}
