import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckSquare, CheckCircle2, Clock, CircleDashed, AlertTriangle, Activity, Users, Globe, FolderOpen, ArrowRight,
} from 'lucide-react'
import { useDashboardStats, useTasks } from '../hooks/queries'
import { useUser } from '../hooks/useAuth'
import StatCard from '../components/dashboard/StatCard'
import BarChart from '../components/dashboard/BarChart'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import QuickFilters from '../components/tasks/QuickFilters'
import TaskTable from '../components/tasks/TaskTable'
import Avatar from '../components/ui/Avatar'
import ProgressBar from '../components/ui/ProgressBar'
import EmptyState from '../components/ui/EmptyState'
import {
  ROLE_LABELS, MANAGEMENT_ROLES, STATUS_LABELS, PRIORITY_LABELS,
  TASK_STATUS_BAR_COLORS, PRIORITY_BAR_COLORS, quickFilterParams,
} from '../utils/constants'

// Short labels — the dashboard bar labels are narrow
const CATEGORY_LABELS = {
  on_page: 'On-Page', off_page: 'Off-Page', technical: 'Technical',
  content: 'Content', research: 'Research', reporting: 'Reporting', other: 'Other',
}
const OVERVIEW_ROWS = 8

const Skeleton = ({ rows = 4, h = 'h-8' }) => (
  <div className="space-y-3">{Array.from({ length: rows }, (_, i) => <div key={i} className={`${h} bg-gray-100 rounded animate-pulse`} />)}</div>
)

export default function Dashboard() {
  const navigate  = useNavigate()
  const user      = useUser()
  const canSeeAll = MANAGEMENT_ROLES.includes(user?.role)

  const { data: stats, isPending: loading } = useDashboardStats()
  const s = stats?.summary

  // Task overview with quick filters (same filters as the Tasks page)
  const [view, setView] = useState('all')
  const { data: tasks = [], isPending: tasksLoading, isFetching } = useTasks(quickFilterParams(view))
  const openList = (v) => navigate(v === 'all' ? '/tasks' : `/tasks?view=${v}`)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Welcome back, {user?.name?.split(' ')[0]}</h2>
          <p className="text-sm text-gray-500">
            {ROLE_LABELS[user?.role]} · {canSeeAll ? 'Showing the whole team' : 'Showing your tasks'}
          </p>
        </div>
        {canSeeAll && !loading && (
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Link to="/websites" className="inline-flex items-center gap-1.5 hover:text-gray-900"><Globe className="w-4 h-4" />{stats?.totalWebsites ?? 0} active websites</Link>
            <span className="inline-flex items-center gap-1.5"><FolderOpen className="w-4 h-4" />{stats?.totalProjects ?? 0} projects</span>
          </div>
        )}
      </div>

      {/* Summary cards — each opens the matching filtered task list */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard icon={CheckSquare}   label="Total Tasks" value={s?.total}      color="bg-blue-500"   onClick={() => openList('all')}
            sub={s?.cancelled ? `${s.cancelled} cancelled not counted` : undefined} />
          <StatCard icon={CheckCircle2}  label="Completed"   value={s?.completed}  color="bg-green-500"  onClick={() => openList('completed')}
            sub={`${stats?.completedThisMonth ?? 0} this month`} />
          <StatCard icon={Clock}         label="In Progress" value={s?.inProgress} color="bg-yellow-500" onClick={() => openList('inProgress')} />
          <StatCard icon={CircleDashed}  label="Pending"     value={s?.pending}    color="bg-gray-400"   onClick={() => openList('pending')} />
          <StatCard icon={AlertTriangle} label="Overdue"     value={s?.overdue}
            color={s?.overdue ? 'bg-red-500' : 'bg-gray-300'} onClick={() => openList('overdue')} />
        </div>
      )}

      {/* Task overview */}
      <div className="card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Task Overview</h3>
            <button onClick={() => openList(view)} className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <QuickFilters value={view} onChange={setView} />
        </div>
        <div className={`flex-1 ${isFetching && !tasksLoading ? 'opacity-60 transition-opacity' : ''}`}>
          {tasksLoading ? (
            <div className="p-4"><Skeleton rows={5} h="h-10" /></div>
          ) : tasks.length === 0 ? (
            <EmptyState icon={CheckSquare} compact title="No tasks here" message="Nothing matches this filter right now." />
          ) : (
            <>
              <TaskTable tasks={tasks.slice(0, OVERVIEW_ROWS)} hideAssignee={!canSeeAll} />
              {tasks.length > OVERVIEW_ROWS && (
                <button onClick={() => openList(view)} className="w-full text-sm text-gray-500 hover:text-blue-600 py-3 border-t border-gray-100">
                  Show all {tasks.length} tasks
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${canSeeAll ? 'lg:grid-cols-2' : ''}`}>
        {/* Recent activity */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Recent Activity
          </h3>
          <div className="max-h-[26rem] overflow-y-auto pr-1">
            <ActivityFeed items={stats?.recentActivity} loading={loading} />
          </div>
        </div>

        {canSeeAll && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Team Workload
              </h3>
              <Link to="/members" className="text-sm text-blue-600 hover:underline">All members</Link>
            </div>
            {loading ? <Skeleton rows={3} /> : !stats?.teamWorkload?.length ? (
              <p className="text-sm text-gray-400 py-4 text-center">No tasks assigned yet.</p>
            ) : (
              <ul className="space-y-1">
                {stats.teamWorkload.slice(0, 8).map((m) => (
                  <li key={m.id}>
                    <Link to={`/members/${m.id}`} className="flex items-center gap-3 p-1.5 -mx-1.5 rounded-lg hover:bg-gray-50">
                      <Avatar name={m.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700 truncate">{m.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{m.done}/{m.assigned} done</span>
                        </div>
                        <ProgressBar value={m.assigned ? Math.round((m.done / m.assigned) * 100) : 0} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-5 ${canSeeAll ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tasks by Status</h3>
          {loading ? <Skeleton h="h-4" /> :
            <BarChart data={stats?.tasksByStatus || {}} colors={TASK_STATUS_BAR_COLORS} labels={STATUS_LABELS} total={stats?.totalTasks} />}
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Tasks by Category</h3>
          {loading ? <Skeleton h="h-4" /> :
            <BarChart data={stats?.tasksByCategory || {}} labels={CATEGORY_LABELS} total={stats?.totalTasks} />}
        </div>
        <div className={`card p-5 ${canSeeAll ? '' : 'lg:col-span-2'}`}>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Priority Distribution</h3>
          {loading ? <Skeleton h="h-4" /> :
            <BarChart data={stats?.tasksByPriority || {}} colors={PRIORITY_BAR_COLORS} labels={PRIORITY_LABELS} total={stats?.totalTasks} />}
        </div>
      </div>
    </div>
  )
}
