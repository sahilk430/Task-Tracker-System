import { Calendar, Clock } from 'lucide-react'
import { useWebsites, useProjects, useUsers } from '../../hooks/queries'
import { PRIORITY_LABELS, CATEGORIES, categoryLabel } from '../../utils/constants'
import { fmtDate } from '../../utils/format'

// Details / Dates / Hours cards. `canManage` unlocks priority, assignee, website and project edits.
export default function TaskSidebar({ task, editing, form, f, canManage }) {
  // Dropdown options are only needed while editing
  const { data: websites = [] } = useWebsites({ enabled: editing && canManage })
  const { data: allUsers = [] } = useUsers({}, { enabled: editing && canManage })
  const { data: projects = [] } = useProjects(editing && canManage ? form.websiteId : null)

  return (
    <div className="space-y-4">
      {/* Details */}
      <div className="card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Details</h3>
        {editing ? (
          <div className="space-y-3">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select value={form.category} onChange={f('category')} className="input-field">
                {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            {canManage && (
              <>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <select value={form.priority} onChange={f('priority')} className="input-field">
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
                  <select value={form.assignedTo} onChange={f('assignedTo')} className="input-field">
                    {allUsers.filter((u) => u.isActive).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Website</label>
                  <select value={form.websiteId} onChange={f('websiteId')} className="input-field">
                    {websites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
                  <select value={form.projectId} onChange={f('projectId')} className="input-field">
                    <option value="">No project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        ) : (
          <dl className="space-y-2">
            {[{ label:'Website', value: task.website?.name }, { label:'Project', value: task.project?.name || '—' },
              { label:'Category', value: categoryLabel(task.category) }].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-xs text-gray-400">{label}</dt>
                <dd className="text-sm text-gray-700 font-medium">{value || '—'}</dd>
              </div>
            ))}
            {task.assignee && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                <dt className="text-xs text-gray-400">Assigned to</dt>
                <dd className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {task.assignee.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{task.assignee.name}</span>
                </dd>
              </div>
            )}
          </dl>
        )}
      </div>

      {/* Dates */}
      <div className="card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Dates</h3>
        {editing ? (
          <div className="space-y-2">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label><input type="date" value={form.startDate} onChange={f('startDate')} className="input-field" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label><input type="date" value={form.dueDate} onChange={f('dueDate')} className="input-field" /></div>
          </div>
        ) : (
          <dl className="space-y-2">
            <div className="flex items-center justify-between"><dt className="text-xs text-gray-400">Start</dt><dd className="text-sm text-gray-700">{fmtDate(task.startDate)}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-xs text-gray-400">Due</dt>
              <dd className={`text-sm font-medium ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-700'}`}>{fmtDate(task.dueDate)}</dd>
            </div>
            <div className="flex items-center justify-between"><dt className="text-xs text-gray-400">Created</dt><dd className="text-sm text-gray-700">{fmtDate(task.createdAt)}</dd></div>
          </dl>
        )}
      </div>

      {/* Hours */}
      <div className="card p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />Hours</h3>
        {editing ? (
          <div className="space-y-2">
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Estimated</label><input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={f('estimatedHours')} className="input-field" /></div>
            <div><label className="block text-xs font-medium text-gray-500 mb-1">Actual</label><input type="number" min="0" step="0.5" value={form.actualHours} onChange={f('actualHours')} className="input-field" /></div>
          </div>
        ) : (
          <dl className="space-y-2">
            <div className="flex items-center justify-between"><dt className="text-xs text-gray-400">Estimated</dt><dd className="text-sm text-gray-700">{task.estimatedHours != null ? `${task.estimatedHours}h` : '—'}</dd></div>
            <div className="flex items-center justify-between"><dt className="text-xs text-gray-400">Actual</dt><dd className="text-sm text-gray-700">{task.actualHours != null ? `${task.actualHours}h` : '—'}</dd></div>
            {task.estimatedHours && task.actualHours && (
              <div className="mt-1 pt-2 border-t border-gray-100">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${task.actualHours > task.estimatedHours ? 'bg-red-400' : 'bg-green-400'}`}
                    style={{ width: `${Math.min(100, (task.actualHours / task.estimatedHours) * 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">{Math.round((task.actualHours / task.estimatedHours) * 100)}% used</p>
              </div>
            )}
          </dl>
        )}
      </div>
    </div>
  )
}
