import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, ChevronDown } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { ROLE_LABELS } from '../utils/constants'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/users':     'Team Management',
  '/websites':  'Websites',
  '/tasks':     'Tasks',
  '/reports':   'Reports',
}

export default function Header() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate  = useNavigate()
  const location  = useLocation()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">
        {PAGE_TITLES[location.pathname] || 'SEO Tracker'}
      </h1>

      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
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
    </header>
  )
}
