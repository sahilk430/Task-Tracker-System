import { useNavigate } from 'react-router-dom'
import { CheckSquare, Globe, TrendingUp, AlertTriangle, FolderOpen, Activity, Users } from 'lucide-react'
import { useDashboardStats } from '../hooks/queries'
import { useUser } from '../hooks/useAuth'
import StatCard from '../components/dashboard/StatCard'
import BarChart from '../components/dashboard/BarChart'
import { ROLE_LABELS, ADMIN_ROLES, STATUS_LABELS, PRIORITY_LABELS } from '../utils/constants'
import { fmtDateTime } from '../utils/format'

// Short labels — the dashboard bar labels are narrow
const CATEGORY_LABELS = {
  on_page: 'On-Page', off_page: 'Off-Page', technical: 'Technical',
  content: 'Content', research: 'Research', reporting: 'Reporting', other: 'Other',
}

const ACTIVITY_TEXT = {
  status_changed:   (a) => `moved "${a.task?.title}" to ${STATUS_LABELS[a.newValue] || a.newValue}`,
  priority_changed: (a) => `changed priority of "${a.task?.title}"`,
  reassigned:       (a) => `reassigned "${a.task?.title}"`,
  commented:        (a) => `commented on "${a.task?.title}"`,
}

const STATUS_BAR_COLORS = {
  backlog: 'bg-gray-400', todo: 'bg-blue-400', in_progress: 'bg-yellow-400',
  in_review: 'bg-purple-400', done: 'bg-green-500', cancelled: 'bg-red-300',
}

const PRIORITY_BAR_COLORS = {
  critical: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-green-400',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user     = useUser()
  const isAdmin  = ADMIN_ROLES.includes(user?.role)
  const canSeeAll = isAdmin || user?.role === 'marketing_manager'

  const { data: stats, isPending: loading } = useDashboardStats()

  const inProgress = stats?.tasksByStatus?.in_progress || 0

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="card p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
        <h2 className="text-xl font-bold mb-1">Welcome back, {user?.name?.split(' ')[0]}!</h2>
        <p className="text-blue-100 text-sm">
          {ROLE_LABELS[user?.role]} · {canSeeAll ? 'Full team visibility' : 'Showing your tasks'}
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={CheckSquare}   label="Total Tasks"      value={stats?.totalTasks}         color="bg-blue-500"   onClick={() => navigate('/tasks')} />
          <StatCard icon={TrendingUp}    label="In Progress"      value={inProgress}                color="bg-yellow-500" onClick={() => navigate('/tasks?status=in_progress')} />
          <StatCard icon={CheckSquare}   label="Done This Month"  value={stats?.completedThisMonth} color="bg-green-500" />
          <StatCard icon={AlertTriangle} label="Overdue"          value={stats?.overdueCount}
            color={stats?.overdueCount > 0 ? 'bg-red-500' : 'bg-gray-400'}
            onClick={stats?.overdueCount > 0 ? () => navigate('/tasks') : undefined} />
        </div>
      )}

      {canSeeAll && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          <StatCard icon={Globe}       label="Active Websites" value={stats?.totalWebsites}  color="bg-purple-500" onClick={() => navigate('/websites')} />
          <StatCard icon={FolderOpen}  label="Total Projects"  value={stats?.totalProjects}  color="bg-indigo-500" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Task Status Breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tasks by Status</h3>
          {loading
            ? <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />)}</div>
            : <BarChart data={stats?.tasksByStatus || {}} colors={STATUS_BAR_COLORS} labels={STATUS_LABELS} total={stats?.totalTasks} />
          }
        </div>

        {/* Task Category Breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tasks by Category</h3>
          {loading
            ? <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-4 bg-gray-100 rounded animate-pulse" />)}</div>
            : <BarChart data={stats?.tasksByCategory || {}} labels={CATEGORY_LABELS} total={stats?.totalTasks} />
          }
        </div>
      </div>

      {/* Priority Distribution */}
      {!loading && stats?.tasksByPriority && Object.keys(stats.tasksByPriority).length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Priority Distribution</h3>
          <div className="flex items-end gap-3 h-20">
            {['critical','high','medium','low'].map((p) => {
              const count = stats.tasksByPriority[p] || 0
              const max   = Math.max(...Object.values(stats.tasksByPriority))
              return (
                <div key={p} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-gray-700">{count}</span>
                  <div className={`w-full rounded-t-md ${PRIORITY_BAR_COLORS[p]}`}
                    style={{ height: `${max ? Math.max(4, (count / max) * 56) : 4}px` }} />
                  <span className="text-xs text-gray-500">{PRIORITY_LABELS[p]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Team Workload */}
        {canSeeAll && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Team Workload
            </h3>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !stats?.teamWorkload?.length ? (
              <p className="text-sm text-gray-400 italic">No tasks assigned yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.teamWorkload.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 truncate">{m.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{m.done}/{m.assigned}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full"
                          style={{ width: `${m.assigned ? Math.round((m.done / m.assigned) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Activity */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Recent Activity
          </h3>
          {loading ? (
            <div className="space-y-3">{[1,2,3,4].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : !stats?.recentActivity?.length ? (
            <p className="text-sm text-gray-400 italic">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-medium">{a.user?.name}</span>{' '}
                      {(ACTIVITY_TEXT[a.action] || (() => a.action))(a)}
                    </p>
                    <p className="text-xs text-gray-400">{fmtDateTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
