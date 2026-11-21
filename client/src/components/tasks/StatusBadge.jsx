import { STATUS_COLORS, STATUS_LABELS, PRIORITY_COLORS, PRIORITY_LABELS, isTaskOverdue } from '../../utils/constants'

// Real status, plus a separate "Overdue" marker (overdue is never a status of its own)
export function StatusBadge({ task }) {
  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600'}`}>
        {STATUS_LABELS[task.status] || task.status}
      </span>
      {isTaskOverdue(task) && (
        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">Overdue</span>
      )}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-600'}`}>
      {PRIORITY_LABELS[priority] || priority}
    </span>
  )
}
