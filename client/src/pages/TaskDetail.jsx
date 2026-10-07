import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Edit2, Check, X, Trash2 } from 'lucide-react'
import { updateTask, deleteTask } from '../api/tasks'
import { useTask } from '../hooks/queries'
import { useUser } from '../hooks/useAuth'
import TaskWorkflow from '../components/tasks/TaskWorkflow'
import TaskSeoDetails from '../components/tasks/TaskSeoDetails'
import TaskGscMetrics from '../components/tasks/TaskGscMetrics'
import TaskResults from '../components/tasks/TaskResults'
import TaskDiscussion from '../components/tasks/TaskDiscussion'
import TaskSidebar from '../components/tasks/TaskSidebar'
import {
  ADMIN_ROLES, STATUS_COLORS, STATUS_LABELS,
  PRIORITY_COLORS, PRIORITY_LABELS, categoryLabel,
} from '../utils/constants'

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user      = useUser()
  const isAdmin   = ADMIN_ROLES.includes(user?.role)
  const isManager = user?.role === 'marketing_manager'
  const queryClient = useQueryClient()

  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({})
  const [saveErr, setSaveErr]   = useState('')

  const taskQuery = useTask(id)
  const task      = taskQuery.data
  const loading   = taskQuery.isPending

  useEffect(() => {
    if (taskQuery.isError) navigate('/tasks')
  }, [taskQuery.isError, navigate])

  const taskToForm = (t) => ({
    title: t.title || '', description: t.description || '',
    websiteId: t.website?.id || '', projectId: t.project?.id || '',
    category: t.category || '', status: t.status || 'backlog', priority: t.priority || 'medium',
    assignedTo: t.assignee?.id || '',
    dueDate:   t.dueDate   ? t.dueDate.slice(0, 10)   : '',
    startDate: t.startDate ? t.startDate.slice(0, 10) : '',
    estimatedHours: t.estimatedHours ?? '', actualHours: t.actualHours ?? '',
    targetUrl: t.targetUrl || '', targetKeywords: t.targetKeywords || '',
    searchIntent: t.searchIntent || '',
    currentRanking: t.currentRanking ?? '', targetRanking: t.targetRanking ?? '',
    expectedResult: t.expectedResult || '', actualResult: t.actualResult || '',
    gscImpressionsBefore: t.gscImpressionsBefore ?? '', gscImpressionsAfter: t.gscImpressionsAfter ?? '',
    gscClicksBefore: t.gscClicksBefore ?? '', gscClicksAfter: t.gscClicksAfter ?? '',
    backlinksCount: t.backlinksCount ?? '', toolsUsed: t.toolsUsed || '', tags: t.tags || '',
  })

  const saveTask = useMutation({
    mutationFn: () => {
      const payload = { ...form }
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null })
      return updateTask(id, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setEditing(false)
    },
    onError: (err) => setSaveErr(err.response?.data?.message || 'Failed to save.'),
  })
  const saving = saveTask.isPending

  const changeStatus = useMutation({
    mutationFn: (newStatus) => updateTask(id, { status: newStatus }),
    onSuccess:  (_, newStatus) => {
      queryClient.setQueryData(['tasks', 'detail', id], (prev) => prev && { ...prev, status: newStatus })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', id, 'activity'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
    },
  })
  const statusSaving = changeStatus.isPending

  const removeTask = useMutation({
    mutationFn: () => deleteTask(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
      navigate('/tasks')
    },
  })

  const startEditing = () => { setForm(taskToForm(task)); setSaveErr(''); setEditing(true) }

  const handleSave = () => { setSaveErr(''); saveTask.mutate() }

  const handleStatusChange = (newStatus) => {
    if (task.status === newStatus || statusSaving) return
    changeStatus.mutate(newStatus)
  }

  const handleDelete = () => {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    removeTask.mutate()
  }

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }))

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-40 bg-gray-100 rounded animate-pulse" />
      <div className="card h-48 animate-pulse bg-gray-100" />
    </div>
  )
  if (!task) return null

  const canEdit = isAdmin || isManager || task.assignee?.id === user?.id

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/tasks')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Back to Tasks
        </button>
        <div className="flex items-center gap-2">
          {saveErr && <span className="text-xs text-red-500">{saveErr}</span>}
          {canEdit && !editing && (
            <button onClick={startEditing} className="btn-secondary flex items-center gap-2">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary flex items-center gap-2">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
          {isAdmin && !editing && (
            <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Title + status */}
      <div className="card p-5">
        {editing
          ? <input type="text" value={form.title} onChange={f('title')} className="input-field text-lg font-semibold mb-3" />
          : <h1 className="text-xl font-bold text-gray-900 mb-3">{task.title}</h1>
        }
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
          <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
            {categoryLabel(task.category)}
          </span>
          {task.tags && task.tags.split(',').map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{t.trim()}</span>
          ))}
        </div>

        {/* Workflow */}
        {!editing && <TaskWorkflow status={task.status} onChange={handleStatusChange} disabled={statusSaving} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">

          {/* Description */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
            {editing
              ? <textarea value={form.description} onChange={f('description')} className="input-field" rows={4} placeholder="Describe this task…" />
              : <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.description || <span className="italic text-gray-400">No description.</span>}</p>
            }
          </div>

          {/* SEO Details */}
          <TaskSeoDetails task={task} editing={editing} form={form} f={f} />

          {/* GSC Metrics */}
          <TaskGscMetrics task={task} editing={editing} form={form} f={f} />

          {/* Results */}
          <TaskResults task={task} editing={editing} form={form} f={f} />

          {/* Comments + Activity */}
          <TaskDiscussion taskId={id} />
        </div>

        {/* Sidebar */}
        <TaskSidebar task={task} editing={editing} form={form} f={f} canManage={isAdmin || isManager} />
      </div>
    </div>
  )
}
