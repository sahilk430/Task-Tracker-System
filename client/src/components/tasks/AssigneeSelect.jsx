import { AlertTriangle } from 'lucide-react'
import { ROLE_LABELS } from '../../utils/constants'

// Open work above which a person counts as busy when picking an assignee
export const HEAVY_OPEN_TASKS = 6
export const HEAVY_OVERDUE_TASKS = 2

const openCount = (m) => (m.stats?.pending || 0) + (m.stats?.inProgress || 0)
const isHeavy   = (m) => openCount(m) >= HEAVY_OPEN_TASKS || (m.stats?.overdue || 0) >= HEAVY_OVERDUE_TASKS

// Assignee dropdown that shows everyone's current load and warns before overloading someone.
// `members` come from /api/members (they carry `stats`).
export default function AssigneeSelect({ members, value, onChange, required, showRole = false, currentId }) {
  const active = members.filter((m) => m.isActive || m.id === value)
  // Least loaded first so the obvious choice is at the top
  const sorted = [...active].sort((a, b) => openCount(a) - openCount(b) || a.name.localeCompare(b.name))
  const chosen = active.find((m) => m.id === value)
  // Reassigning to the same person adds no load
  const warn = chosen && chosen.id !== currentId && isHeavy(chosen)

  return (
    <div>
      <select value={value} onChange={onChange} className="input-field" required={required}>
        {!value && <option value="">Select…</option>}
        {sorted.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}{showRole && ROLE_LABELS[m.role] ? ` (${ROLE_LABELS[m.role]})` : ''} — {openCount(m)} open{m.stats?.overdue ? `, ${m.stats.overdue} overdue` : ''}
          </option>
        ))}
      </select>
      {warn && (
        <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
          <span>
            {chosen.name} already has {openCount(chosen)} open task{openCount(chosen) === 1 ? '' : 's'}
            {chosen.stats?.overdue ? ` (${chosen.stats.overdue} overdue)` : ''}. Consider someone with less work.
          </span>
        </p>
      )}
    </div>
  )
}
