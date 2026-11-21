import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import ProgressBar from '../ui/ProgressBar'
import { ROLE_LABELS } from '../../utils/constants'

const Count = ({ label, value, tone = 'text-gray-900' }) => (
  <div className="text-center min-w-0">
    <p className={`text-base font-semibold ${tone}`}>{value}</p>
    <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
  </div>
)

export default function MemberCard({ member }) {
  const s = member.stats
  return (
    <Link to={`/members/${member.id}`}
      className="card p-5 flex flex-col gap-4 hover:border-blue-300 hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={member.name} src={member.avatarUrl} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{member.name}</p>
          <p className="text-xs text-gray-500 truncate">{ROLE_LABELS[member.role] || member.role}</p>
        </div>
        {!member.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-xs text-gray-500">{s.completed} of {s.total} task{s.total !== 1 ? 's' : ''} completed</span>
          <span className="text-sm font-semibold text-gray-900">{s.completionRate}%</span>
        </div>
        <ProgressBar value={s.completionRate} />
      </div>

      <div className="grid grid-cols-4 gap-1 pt-3 border-t border-gray-100">
        <Count label="Pending"     value={s.pending} />
        <Count label="In Progress" value={s.inProgress} />
        <Count label="Completed"   value={s.completed} tone="text-green-600" />
        <Count label="Overdue"     value={s.overdue} tone={s.overdue ? 'text-red-600' : 'text-gray-900'} />
      </div>
    </Link>
  )
}
