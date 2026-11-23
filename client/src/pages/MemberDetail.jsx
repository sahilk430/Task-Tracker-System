import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckSquare, CheckCircle2, Clock, CircleDashed, AlertTriangle, CalendarClock, Mail, ShieldAlert,
} from 'lucide-react'
import { useMember, useTasks } from '../hooks/queries'
import { useUser } from '../hooks/useAuth'
import Avatar from '../components/ui/Avatar'
import ProgressBar from '../components/ui/ProgressBar'
import EmptyState from '../components/ui/EmptyState'
import StatCard from '../components/dashboard/StatCard'
import BarChart from '../components/dashboard/BarChart'
import ActivityFeed from '../components/dashboard/ActivityFeed'
import TaskTable from '../components/tasks/TaskTable'
import TeamTrends from '../components/members/TeamTrends'
import {
  MANAGEMENT_ROLES, ROLE_LABELS, STATUS_LABELS, PRIORITY_LABELS, TASK_STATUS_BAR_COLORS, PRIORITY_BAR_COLORS,
} from '../utils/constants'
import { fmtDate, fmtDateLong } from '../utils/format'

// Status filter values: a summary group, overdue, or one exact status
const STATUS_FILTERS = [
  { value: '',                 label: 'All statuses',      params: {} },
  { value: 'group:pending',    label: 'Pending',           params: { statusGroup: 'pending' } },
  { value: 'group:inProgress', label: 'In Progress (all)', params: { statusGroup: 'inProgress' } },
  { value: 'group:completed',  label: 'Completed',         params: { statusGroup: 'completed' } },
  { value: 'overdue',          label: 'Overdue',           params: { overdue: 'true' } },
  ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: `status:${v}`, label: `Status: ${l}`, params: { status: v } })),
]
const EMPTY_FILTERS = { status: '', priority: '', dueFrom: '', dueTo: '' }

function MiniList({ title, icon: Icon, tasks, empty, dateLabel, dateOf, tone = 'text-gray-500' }) {
  return (
    <div className="card p-5 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${tone}`} /> {title}
        <span className="ml-auto text-xs font-normal text-gray-400">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100 -mx-1">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link to={`/tasks/${t.id}`} className="flex items-start gap-3 px-1 py-2 rounded hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 truncate">{t.title}</p>
                  <p className="text-xs text-gray-400 truncate">{t.website?.name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-xs font-medium ${tone}`}>{fmtDate(dateOf(t))}</p>
                  <p className="text-[11px] text-gray-400">{dateLabel}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function MemberDetail() {
  const { id } = useParams()
  const user = useUser()
  const canSeeTeam = MANAGEMENT_ROLES.includes(user?.role)
  const { data, isPending, error } = useMember(id)

  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const sf = (key) => (e) => setFilters((p) => ({ ...p, [key]: e.target.value }))
  const params = {
    assignedTo: id,
    ...STATUS_FILTERS.find((s) => s.value === filters.status)?.params,
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.dueFrom && { dueFrom: filters.dueFrom }),
    ...(filters.dueTo && { dueTo: filters.dueTo }),
  }
  const { data: tasks = [], isPending: tasksLoading, isFetching } = useTasks(params, { enabled: !!data })
  const filtered = Object.values(filters).some(Boolean)
  const setStatusFilter = (status) => {
    setFilters({ ...EMPTY_FILTERS, status })
    document.getElementById('member-tasks')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (error) {
    const status = error.response?.status
    return (
      <div className="card">
        <EmptyState icon={ShieldAlert}
          title={status === 403 ? 'You can only view your own dashboard' : status === 404 ? 'Member not found' : 'Could not load this member'}
          action={<Link to={canSeeTeam ? '/members' : `/members/${user?.id}`} className="btn-secondary inline-block">Go back</Link>} />
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="space-y-5">
        <div className="card h-28 animate-pulse bg-gray-100" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}</div>
        <div className="card h-64 animate-pulse bg-gray-100" />
      </div>
    )
  }

  const { member, stats, byStatus, byPriority, upcoming, overdue, completed, recentActivity } = data
  const isSelf = member.id === user?.id
  const priorityTotal = Object.values(byPriority).reduce((a, b) => a + b, 0)
  const statusTotal   = Object.values(byStatus).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-5">
      {canSeeTeam && (
        <Link to="/members" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> All team members
        </Link>
      )}

      {/* Member information */}
      <div className="card p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Avatar name={member.name} src={member.avatarUrl} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{member.name}{isSelf && <span className="text-gray-400 font-normal"> (you)</span>}</h2>
              {!member.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
            </div>
            <p className="text-sm text-gray-500">{ROLE_LABELS[member.role] || member.role}</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{member.email}</span>
              <span>Member since {fmtDateLong(member.createdAt)}</span>
            </p>
          </div>
        </div>
        <div className="md:w-64">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm text-gray-500">Completion</span>
            <span className="text-2xl font-bold text-gray-900">{stats.completionRate}%</span>
          </div>
          <ProgressBar value={stats.completionRate} className="h-2" />
          <p className="text-xs text-gray-400 mt-1.5">
            {stats.completed} of {stats.total} assigned task{stats.total !== 1 ? 's' : ''} completed
            {stats.cancelled > 0 && ` · ${stats.cancelled} cancelled (excluded)`}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={CheckSquare}   label="Assigned"    value={stats.total}      color="bg-blue-500"   onClick={() => setStatusFilter('')} />
        <StatCard icon={CheckCircle2}  label="Completed"   value={stats.completed}  color="bg-green-500"  onClick={() => setStatusFilter('group:completed')} />
        <StatCard icon={Clock}         label="In Progress" value={stats.inProgress} color="bg-yellow-500" onClick={() => setStatusFilter('group:inProgress')} />
        <StatCard icon={CircleDashed}  label="Pending"     value={stats.pending}    color="bg-gray-400"   onClick={() => setStatusFilter('group:pending')} />
        <StatCard icon={AlertTriangle} label="Overdue"     value={stats.overdue}
          color={stats.overdue ? 'bg-red-500' : 'bg-gray-300'} onClick={() => setStatusFilter('overdue')} />
      </div>

      <TeamTrends memberId={id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Status Summary</h3>
          <BarChart data={byStatus} colors={TASK_STATUS_BAR_COLORS} labels={STATUS_LABELS} total={statusTotal} />
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Task Priority Summary</h3>
          <BarChart data={byPriority} colors={PRIORITY_BAR_COLORS} labels={PRIORITY_LABELS} total={priorityTotal} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <MiniList title="Upcoming Deadlines" icon={CalendarClock} tasks={upcoming} tone="text-blue-600"
          empty="Nothing due in the next 14 days." dateLabel="due" dateOf={(t) => t.dueDate} />
        <MiniList title="Overdue" icon={AlertTriangle} tasks={overdue} tone="text-red-600"
          empty="No overdue tasks." dateLabel="was due" dateOf={(t) => t.dueDate} />
        <MiniList title="Recently Completed" icon={CheckCircle2} tasks={completed} tone="text-green-600"
          empty="No completed tasks yet." dateLabel="completed" dateOf={(t) => t.completedAt || t.updatedAt} />
      </div>

      {/* All tasks with filters */}
      <div id="member-tasks" className="card overflow-hidden scroll-mt-4">
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-700">
              All Assigned Tasks <span className="font-normal text-gray-400">({tasksLoading ? '…' : tasks.length})</span>
            </h3>
            {filtered && <button onClick={() => setFilters(EMPTY_FILTERS)} className="text-sm text-blue-600 hover:underline">Clear filters</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select value={filters.status} onChange={sf('status')} className="input-field" aria-label="Status filter">
              {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select value={filters.priority} onChange={sf('priority')} className="input-field" aria-label="Priority filter">
              <option value="">All priorities</option>
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-14 flex-shrink-0">Due from</span>
              <input type="date" value={filters.dueFrom} onChange={sf('dueFrom')} className="input-field" />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-14 flex-shrink-0">Due to</span>
              <input type="date" value={filters.dueTo} min={filters.dueFrom || undefined} onChange={sf('dueTo')} className="input-field" />
            </label>
          </div>
        </div>
        <div className={isFetching && !tasksLoading ? 'opacity-60 transition-opacity' : ''}>
          {tasksLoading ? (
            <div className="p-4 space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : tasks.length === 0 ? (
            <EmptyState icon={CheckSquare} compact
              title={filtered ? 'No tasks match these filters' : 'No tasks assigned yet'}
              message={filtered ? 'Try clearing a filter.' : undefined} />
          ) : (
            <TaskTable tasks={tasks} hideAssignee />
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Task History</h3>
        <ActivityFeed items={recentActivity} />
      </div>
    </div>
  )
}
