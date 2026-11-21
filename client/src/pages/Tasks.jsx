import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, CheckSquare, Search } from 'lucide-react'
import { createTask, deleteTask } from '../api/tasks'
import { useTasks, useWebsites, useProjects, useMembers } from '../hooks/queries'
import { useUser } from '../hooks/useAuth'
import { useDebounce } from '../hooks/useDebounce'
import Modal from '../components/ui/Modal'
import FormError from '../components/ui/FormError'
import EmptyState from '../components/ui/EmptyState'
import QuickFilters from '../components/tasks/QuickFilters'
import TaskTable from '../components/tasks/TaskTable'
import {
  ADMIN_ROLES, STATUS_LABELS, PRIORITY_LABELS, ROLE_LABELS, CATEGORIES, QUICK_FILTERS, quickFilterParams,
} from '../utils/constants'

const NO_FILTERS = { websiteId: '', status: '', priority: '', category: '', search: '', dueFrom: '', dueTo: '' }

const EMPTY = {
  title: '', description: '', websiteId: '', projectId: '', category: '',
  status: 'backlog', priority: 'medium', assignedTo: '',
  dueDate: '', startDate: '', estimatedHours: '',
  targetUrl: '', targetKeywords: '', searchIntent: '',
  expectedResult: '', toolsUsed: '', tags: '',
}

export default function Tasks() {
  const user      = useUser()
  const isAdmin   = ADMIN_ROLES.includes(user?.role)
  const canCreate = isAdmin || user?.role === 'marketing_manager'
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  // ?view=mine|pending|inProgress|completed|overdue (quick filter) and ?status=… let other pages
  // (e.g. the Dashboard cards) open this list pre-filtered. `view` lives in the URL, so clicking
  // a card while already on this page still applies it.
  const view = QUICK_FILTERS.some((q) => q.value === searchParams.get('view')) ? searchParams.get('view') : 'all'
  const setView = (v) => setSearchParams((prev) => {
    const next = new URLSearchParams(prev)
    if (v === 'all') next.delete('view')
    else next.set('view', v)
    return next
  }, { replace: true })

  const [filters, setFilters]   = useState({ ...NO_FILTERS, status: searchParams.get('status') || '' })
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState(EMPTY)
  const [formError, setFormError] = useState('')
  const search = useDebounce(filters.search)

  const params = { ...quickFilterParams(view) }
  if (filters.websiteId) params.websiteId = filters.websiteId
  if (filters.status)    params.status    = filters.status
  if (filters.priority)  params.priority  = filters.priority
  if (filters.category)  params.category  = filters.category
  if (search)            params.search    = search
  if (filters.dueFrom)   params.dueFrom   = filters.dueFrom
  if (filters.dueTo)     params.dueTo     = filters.dueTo

  const { data: tasks = [], isPending: loading, isFetching } = useTasks(params)
  const { data: websites = [] } = useWebsites()
  // /members is readable by every role that may create tasks (/users is admin-only)
  const { data: allUsers = [] } = useMembers({ enabled: canCreate })
  const { data: projects = [] } = useProjects(form.websiteId)

  const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ['tasks'] })

  const openModal  = () => { setForm(EMPTY); setFormError(''); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setFormError('') }

  const addTask = useMutation({
    mutationFn: () => {
      const payload = { ...form }
      if (!payload.projectId)      delete payload.projectId
      if (!payload.estimatedHours) delete payload.estimatedHours
      if (!payload.startDate)      delete payload.startDate
      if (!payload.dueDate)        delete payload.dueDate
      return createTask(payload)
    },
    onSuccess: () => { closeModal(); invalidateTasks() },
    onError:   (err) => setFormError(err.response?.data?.message || 'Something went wrong.'),
  })
  const saving = addTask.isPending

  const removeTask = useMutation({
    mutationFn: (task) => deleteTask(task.id),
    onSuccess:  invalidateTasks,
  })

  const handleSubmit = (e) => { e.preventDefault(); setFormError(''); addTask.mutate() }

  const handleDelete = (task) => {
    if (!confirm(`Delete "${task.title}"?`)) return
    removeTask.mutate(task)
  }

  const f   = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))
  const sf  = (key) => (e) => setFilters((p) => ({ ...p, [key]: e.target.value }))
  const hasFilters = view !== 'all' || Object.values(filters).some(Boolean)
  const clearFilters = () => { setFilters(NO_FILTERS); setView('all') }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {loading ? 'Loading…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
          {hasFilters && <button onClick={clearFilters} className="ml-3 text-blue-600 hover:underline">Clear filters</button>}
        </p>
        {canCreate && (
          <button onClick={openModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <QuickFilters value={view} onChange={setView} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="sm:col-span-2 lg:col-span-2 relative">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:max-w-xl">
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-14 flex-shrink-0">Due from</span>
            <input type="date" value={filters.dueFrom} onChange={sf('dueFrom')} className="input-field" />
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-14 flex-shrink-0">Due to</span>
            <input type="date" value={filters.dueTo} min={filters.dueFrom || undefined} onChange={sf('dueTo')} className="input-field" />
          </label>
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
        <div className="card">
          <EmptyState icon={CheckSquare} title="No tasks found"
            message={hasFilters ? 'Try adjusting or clearing your filters.' : canCreate ? 'Add a task to get started.' : 'No tasks are assigned to you yet.'} />
        </div>
      ) : (
        <div className={`card overflow-hidden ${isFetching ? 'opacity-60 transition-opacity' : ''}`}>
          <TaskTable tasks={tasks} onDelete={isAdmin ? handleDelete : undefined} />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <Modal title="Add New Task" onClose={closeModal} size="2xl">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <FormError message={formError} />

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
        </Modal>
      )}
    </div>
  )
}
