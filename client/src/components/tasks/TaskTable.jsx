import { useNavigate } from 'react-router-dom'
import { X, ListChecks, Paperclip } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { StatusBadge, PriorityBadge } from './StatusBadge'
import { isTaskOverdue } from '../../utils/constants'
import { fmtDate } from '../../utils/format'

// Checklist progress and file count, shown under the title when present
function TaskMeta({ task }) {
  const steps = task.checklist?.length || 0
  const done  = task.checklist?.filter((i) => i.done).length || 0
  const files = task._count?.attachments || 0
  if (!steps && !files) return null
  return (
    <span className="inline-flex items-center gap-2 text-[11px] text-gray-400 ml-1">
      {steps > 0 && <span className={`inline-flex items-center gap-0.5 ${done === steps ? 'text-green-600' : ''}`}><ListChecks className="w-3 h-3" />{done}/{steps}</span>}
      {files > 0 && <span className="inline-flex items-center gap-0.5"><Paperclip className="w-3 h-3" />{files}</span>}
    </span>
  )
}

// Task overview: a table on desktop / tablet, stacked cards on phones.
// `hideAssignee` for lists already scoped to one person; `onDelete` shows a delete button.
export default function TaskTable({ tasks, hideAssignee = false, onDelete }) {
  const navigate = useNavigate()
  const open = (t) => navigate(`/tasks/${t.id}`)
  const dueClass = (t) => (isTaskOverdue(t) ? 'text-red-600 font-medium' : 'text-gray-600')

  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-200 bg-gray-50/60">
              <th className="px-4 py-3 font-medium">Task</th>
              {!hideAssignee && <th className="px-4 py-3 font-medium">Assigned To</th>}
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Start</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Due</th>
              <th className="px-4 py-3 font-medium whitespace-nowrap">Completed</th>
              {onDelete && <th className="px-2 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((t) => (
              <tr key={t.id} onClick={() => open(t)} className="hover:bg-gray-50 cursor-pointer group">
                <td className="px-4 py-3 max-w-[18rem]">
                  <p className="font-medium text-gray-900 truncate group-hover:text-blue-600">{t.title}</p>
                  <p className="text-xs text-gray-400 truncate">{t.website?.name}{t.project && ` · ${t.project.name}`}<TaskMeta task={t} /></p>
                </td>
                {!hideAssignee && (
                  <td className="px-4 py-3">
                    {t.assignee ? (
                      <span className="flex items-center gap-2 min-w-0">
                        <Avatar name={t.assignee.name} src={t.assignee.avatarUrl} size="sm" />
                        <span className="text-gray-700 truncate">{t.assignee.name}</span>
                      </span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                )}
                <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-3"><StatusBadge task={t} /></td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(t.startDate)}</td>
                <td className={`px-4 py-3 whitespace-nowrap ${dueClass(t)}`}>{fmtDate(t.dueDate)}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(t.completedAt)}</td>
                {onDelete && (
                  <td className="px-2 py-3 text-right">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(t) }} aria-label={`Delete ${t.title}`}
                      className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-gray-100">
        {tasks.map((t) => (
          <li key={t.id} onClick={() => open(t)} className="px-4 py-3 active:bg-gray-50 cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-gray-900 min-w-0 break-words">{t.title}</p>
              <PriorityBadge priority={t.priority} />
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <StatusBadge task={t} />
              {!hideAssignee && t.assignee && <span className="text-xs text-gray-500">{t.assignee.name}</span>}
              <TaskMeta task={t} />
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div><dt className="text-gray-400">Start</dt><dd className="text-gray-600">{fmtDate(t.startDate)}</dd></div>
              <div><dt className="text-gray-400">Due</dt><dd className={dueClass(t)}>{fmtDate(t.dueDate)}</dd></div>
              <div><dt className="text-gray-400">Completed</dt><dd className="text-gray-600">{fmtDate(t.completedAt)}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
