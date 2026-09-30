import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Globe, CheckSquare, BarChart2 } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { ROLE_LABELS, ROLE_BADGE_COLORS, ADMIN_ROLES } from '../utils/constants'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: 'all' },
  { to: '/users',     icon: Users,           label: 'Team',       roles: ADMIN_ROLES },
  { to: '/websites',  icon: Globe,           label: 'Websites',   roles: 'all' },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks',      roles: 'all' },
  { to: '/reports',   icon: BarChart2,       label: 'Reports',    roles: ADMIN_ROLES },
]

export default function Sidebar() {
  const user = useAuthStore((s) => s.user)

  const visibleItems = navItems.filter((item) =>
    item.roles === 'all' || item.roles.includes(user?.role)
  )

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">SEO Tracker</p>
          <p className="text-xs text-gray-500">Task Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map(({ to, icon: Icon, label, disabled }) =>
          disabled ? (
            <div key={to} className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 cursor-not-allowed text-sm">
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded-full">Soon</span>
            </div>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          )
        )}
      </nav>

      {/* Current user */}
      {user && (
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_BADGE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
