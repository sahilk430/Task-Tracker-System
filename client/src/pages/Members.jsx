import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { useMembers } from '../hooks/queries'
import { useUser } from '../hooks/useAuth'
import MemberCard from '../components/members/MemberCard'
import EmptyState from '../components/ui/EmptyState'
import { MANAGEMENT_ROLES, ROLE_LABELS } from '../utils/constants'

const SORTS = {
  name:     { label: 'Name',            fn: (a, b) => a.name.localeCompare(b.name) },
  workload: { label: 'Most tasks',      fn: (a, b) => b.stats.total - a.stats.total },
  overdue:  { label: 'Most overdue',    fn: (a, b) => b.stats.overdue - a.stats.overdue },
  progress: { label: 'Completion rate', fn: (a, b) => b.stats.completionRate - a.stats.completionRate },
}

export default function Members() {
  const user = useUser()
  const canSeeTeam = MANAGEMENT_ROLES.includes(user?.role)
  const { data: members = [], isPending, isError } = useMembers()

  const [search, setSearch]   = useState('')
  const [role, setRole]       = useState('')
  const [sort, setSort]       = useState('name')
  const [showInactive, setShowInactive] = useState(false)

  // Team members only ever see themselves — send them straight to their own dashboard
  if (user && !canSeeTeam) return <Navigate to={`/members/${user.id}`} replace />

  const q = search.trim().toLowerCase()
  const visible = members
    .filter((m) => showInactive || m.isActive)
    .filter((m) => !role || m.role === role)
    .filter((m) => !q || m.name.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q))
    .sort(SORTS[sort].fn)

  const inactiveCount = members.filter((m) => !m.isActive).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
        <p className="text-sm text-gray-500">
          {isPending ? 'Loading…' : `${visible.length} member${visible.length !== 1 ? 's' : ''}`}
        </p>
        <p className="text-xs text-gray-400">Completion = completed ÷ assigned tasks (cancelled excluded)</p>
      </div>

      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input type="search" placeholder="Search members…" value={search}
            onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" aria-label="Search members" />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field" aria-label="Filter by role">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field" aria-label="Sort members">
          {Object.entries(SORTS).map(([v, s]) => <option key={v} value={v}>Sort: {s.label}</option>)}
        </select>
        {inactiveCount > 0 && (
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded border-gray-300" />
            Show inactive ({inactiveCount})
          </label>
        )}
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="card h-44 animate-pulse bg-gray-100" />)}
        </div>
      ) : isError ? (
        <div className="card"><EmptyState icon={Users} title="Couldn't load team members" message="Please refresh the page." /></div>
      ) : visible.length === 0 ? (
        <div className="card"><EmptyState icon={Users} title="No members found" message="Try a different search or role filter." /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((m) => <MemberCard key={m.id} member={m} />)}
        </div>
      )}
    </div>
  )
}
