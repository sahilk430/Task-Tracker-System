import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, CheckSquare, X, Search } from 'lucide-react'
import { getTasks, createTask, deleteTask } from '../api/tasks'
import { getWebsites } from '../api/websites'
import { getProjects } from '../api/projects'
import { getUsers } from '../api/users'
import useAuthStore from '../store/authStore'
import {
  ADMIN_ROLES, STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS, ROLE_LABELS,
} from '../utils/constants'

const CATEGORIES = [
  { value: 'on_page',   label: 'On-Page SEO' },
  { value: 'off_page',  label: 'Off-Page SEO' },
  { value: 'technical', label: 'Technical SEO' },
  { value: 'content',   label: 'Content' },
  { value: 'research',  label: 'Research' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other',     label: 'Other' },
]

const CATEGORY_COLORS = {
  on_page:   'bg-blue-100 text-blue-700',
  off_page:  'bg-purple-100 text-purple-700',
  technical: 'bg-orange-100 text-orange-700',
  content:   'bg-green-100 text-green-700',
  research:  'bg-yellow-100 text-yellow-700',
  reporting: 'bg-gray-100 text-gray-700',
  other:     'bg-gray-100 text-gray-500',
}

const PRIORITY_DOT = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-400',
  low:      'bg-green-500',
}

const EMPTY = {
  title: '', description: '', websiteId: '', projectId: '', category: '',
  status: 'backlog', priority: 'medium', assignedTo: '',
  dueDate: '', startDate: '', estimatedHours: '',
  targetUrl: '', targetKeywords: '', searchIntent: '',
  expectedResult: '', toolsUsed: '', tags: '',
}

export default function Tasks() {
  const navigate  = useNavigate()
  const user      = useAuthStore((s) => s.user)
  const isAdmin   = ADMIN_ROLES.includes(user?.role)
  const canCreate = isAdmin || user?.role === 'marketing_manager'

  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [websites, setWebsites] = useState([])
  const [projects, setProjects] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [filters, setFilters]   = useState({ websiteId: '', status: '', priority: '', category: '', search: '' })
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')

  const fetchTasks = () => {
    setLoading(true)
    const params = {}
    if (filters.websiteId) params.websiteId = filters.websiteId
    if (filters.status)    params.status    = filters.status
    if (filters.priority)  params.priority  = filters.priority
    if (filters.category)  params.category  = filters.category
    if (filters.search)    params.search    = filters.search
    getTasks(params).then(({ data }) => setTasks(data.tasks)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchTasks() }, [filters])

  useEffect(() => {
    getWebsites().then(({ data }) => setWebsites(data.websites)).catch(() => {})
    if (canCreate) getUsers().then(({ data }) => setAllUsers(data.users)).catch(() => {})
  }, [])

  useEffect(() => {
    if (form.websiteId) {
      getProjects(form.websiteId).then(({ data }) => setProjects(data.projects)).catch(() => {})
    } else {
      setProjects([])
    }
  }, [form.websiteId])

  const openModal  = () => { setForm(EMPTY); setFormError(''); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setFormError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('')
    try {
      const payload = { ...form }
      if (!payload.projectId)      delete payload.projectId
      if (!payload.estimatedHours) delete payload.estimatedHours
      if (!payload.startDate)      delete payload.startDate
      if (!payload.dueDate)        delete payload.dueDate
      await createTask(payload)
      closeModal(); fetchTasks()
    } catch (err) { setFormError(err.response?.data?.message || 'Something went wrong.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (task, e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${task.title}"?`)) return
    try { await deleteTask(task.id); fetchTasks() } catch {}
  }

  const f   = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
  const sf  = (key) => (e) => setFilters((p) => ({ ...p, [key]: e.target.value }))
  const isOverdue = (d) => d && new Date(d) < new Date()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        {canCreate && (
          <button onClick={openModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search tasks…" value={filters.search} onChange={sf('search')} className="input-field pl-9" />
          </div>
          <select value={filters.websiteId} onChange={sf('websiteId')} className="input-field">
            <option value="">All Websites</option>
            {websites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={filters.status} onChange={sf('status')} className="input-field">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filters.priority} onChange={sf('priority')} className="input-field">
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ value, label }) => (
            <button key={value}
              onClick={() => setFilters((p) => ({ ...p, category: p.category === value ? '' : value }))}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                filters.category === value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="card h-16 animate-pulse bg-gray-100" />)}</div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No tasks found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or add a new task.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {tasks.map((t) => (
            <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 cursor-pointer group">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] || 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {t.website && <span className="text-xs text-gray-400">{t.website.name}</span>}
                  {t.project && <><span className="text-xs text-gray-300">·</span><span className="text-xs text-gray-400">{t.project.name}</span></>}
                  {t.targetKeywords && <><span className="text-xs text-gray-300">·</span><span className="text-xs text-gray-400 italic truncate max-w-[120px]">{t.targetKeywords}</span></>}
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category] || 'bg-gray-100 text-gray-600'}`}>
                  {CATEGORIES.find((c) => c.value === t.category)?.label || t.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[t.status] || t.status}
                </span>
              </div>
              <div className="hidden md:flex flex-col items-end gap-0.5 flex-shrink-0 w-28">
                {t.assignee && <span className="text-xs text-gray-500 truncate w-full text-right">{t.assignee.name}</span>}
                {t.dueDate && (
                  <span className={`text-xs ${isOverdue(t.dueDate) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {new Date(t.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              {isAdmin && (
                <button onClick={(e) => handleDelete(t, e)}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">Add New Task</h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{formError}</div>}

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Basic Info</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" value={form.title} onChange={f('title')} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={f('description')} className="input-field" rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website *</label>
                    <select value={form.websiteId} onChange={f('websiteId')} className="input-field" required>
                      <option value="">Select website…</option>
                      {websites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                    <select value={form.projectId} onChange={f('projectId')} className="input-field" disabled={!form.websiteId}>
                      <option value="">No project</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select value={form.category} onChange={f('category')} className="input-field" required>
                      <option value="">Select…</option>
                      {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select value={form.priority} onChange={f('priority')} className="input-field">
                      {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={form.status} onChange={f('status')} className="input-field">
                      {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign To *</label>
                    <select value={form.assignedTo} onChange={f('assignedTo')} className="input-field" required>
                      <option value="">Select…</option>
                      {allUsers.filter((u) => u.isActive).map((u) => (
                        <option key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role] || u.role})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" value={form.dueDate} onChange={f('dueDate')} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Est. Hours</label>
                    <input type="number" min="0" step="0.5" value={form.estimatedHours} onChange={f('estimatedHours')} className="input-field" placeholder="0" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">SEO Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
                    <input type="text" value={form.targetUrl} onChange={f('targetUrl')} className="input-field" placeholder="https://example.com/page" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Keywords</label>
                    <input type="text" value={form.targetKeywords} onChange={f('targetKeywords')} className="input-field" placeholder="keyword1, keyword2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Intent</label>
                    <select value={form.searchIntent} onChange={f('searchIntent')} className="input-field">
                      <option value="">Select…</option>
                      {['Informational','Navigational','Transactional','Commercial'].map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tools Used</label>
                    <input type="text" value={form.toolsUsed} onChange={f('toolsUsed')} className="input-field" placeholder="Ahrefs, GSC, Screaming Frog" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Result</label>
                  <textarea value={form.expectedResult} onChange={f('expectedResult')} className="input-field" rows={2} placeholder="What outcome is expected?" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input type="text" value={form.tags} onChange={f('tags')} className="input-field" placeholder="tag1, tag2" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Creating…' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
