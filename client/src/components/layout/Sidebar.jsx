import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, UserCog, Globe, CheckSquare, BarChart2, TrendingUp, X } from 'lucide-react'
import { useUser } from '../../hooks/useAuth'
import Avatar from '../ui/Avatar'
import { ROLE_LABELS, ROLE_BADGE_COLORS, ADMIN_ROLES, MANAGEMENT_ROLES } from '../../utils/constants'

const isTeamMember = (role) => !MANAGEMENT_ROLES.includes(role)

// `roles`: 'all', a role list, or a predicate on the user's role. `to` may depend on the user.
const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    roles: 'all' },
  { to: '/members',   icon: Users,           label: 'Team Members', roles: MANAGEMENT_ROLES },
  { to: (u) => `/members/${u.id}`, icon: TrendingUp, label: 'My Progress', roles: isTeamMember },
  { to: '/tasks',     icon: CheckSquare,     label: 'Tasks',        roles: 'all' },
  { to: '/websites',  icon: Globe,           label: 'Websites',     roles: 'all' },
  { to: '/reports',   icon: BarChart2,       label: 'Reports',      roles: ADMIN_ROLES },
  { to: '/users',     icon: UserCog,         label: 'Manage Users', roles: ADMIN_ROLES },
]

const allowed = (item, role) =>
  item.roles === 'all' || (typeof item.roles === 'function' ? item.roles(role) : item.roles.includes(role))

// Fixed column on desktop (lg+); slide-in drawer below that, controlled by `open` / `onClose`
export default function Sidebar({ open = false, onClose }) {
  const user = useUser()
  const visibleItems = navItems.filter((item) => allowed(item, user?.role))

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-200 lg:static lg:translate-x-0 lg:z-auto flex-shrink-0
          ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Main navigation"
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BarChart2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-sm leading-tight">SEO Tracker</p>
            <p className="text-xs text-gray-500">Task Management</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close menu">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map(({ to, icon: Icon, label }) => {
            const href = typeof to === 'function' ? to(user) : to
            return (
              <NavLink
                key={label}
                to={href}
                end={href === '/members'}
                onClick={onClose}
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
          })}
        </nav>

        {user && (
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_BADGE_COLORS[user.role]}`}>
                  {ROLE_LABELS[user.role]}
                </span>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
