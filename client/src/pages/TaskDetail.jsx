import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Check, X, Trash2, Send, ExternalLink,
  Clock, Calendar, Target, BarChart2, MessageSquare, Activity,
} from 'lucide-react'
import { getTask, updateTask, deleteTask, getComments, addComment, deleteComment, getActivity } from '../api/tasks'
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

const STATUS_FLOW = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

const ACTIVITY_LABELS = {
  status_changed:   (a) => `moved to ${STATUS_LABELS[a.newValue] || a.newValue}`,
  priority_changed: (a) => `changed priority to ${PRIORITY_LABELS[a.newValue] || a.newValue}`,
  reassigned:       ()  => 'reassigned the task',
  commented:        ()  => 'left a comment',
}

const fmt     = (d) => d ? new Date(d).toLocaleDateString() : '—'
const fmtTime = (d) => new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user      = useAuthStore((s) => s.user)
  const isAdmin   = ADMIN_ROLES.includes(user?.role)
  const isManager = user?.role === 'marketing_manager'

  const [task, setTask]         = useState(null)
  const [comments, setComments] = useState([])
  const [activity, setActivity] = useState([])
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState('comments')

  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState({})
  const [saving, setSaving]     = useState(false)
  const [saveErr, setSaveErr]   = useState('')
  const [statusSaving, setStatusSaving] = useState(false)

  const [commentText, setCommentText]     = useState('')
  const [commentSaving, setCommentSaving] = useState(false)
  const commentRef = useRef(null)

  const [websites, setWebsites] = useState([])
  const [projects, setProjects] = useState([])
  const [allUsers, setAllUsers] = useState([])

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

  const fetchTask     = async () => { const { data } = await getTask(id); setTask(data.task); setForm(taskToForm(data.task)) }
  const fetchComments = ()       => getComments(id).then(({ data }) => setComments(data.comments)).catch(() => {})
  const fetchActivity = ()       => getActivity(id).then(({ data }) => setActivity(data.activity)).catch(() => {})

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchTask(), fetchComments(), fetchActivity()])
      .catch(() => navigate('/tasks'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!editing) return
    getWebsites().then(({ data }) => setWebsites(data.websites)).catch(() => {})
    if (isAdmin || isManager) getUsers().then(({ data }) => setAllUsers(data.users)).catch(() => {})
  }, [editing])

  useEffect(() => {
    if (editing && form.websiteId)
      getProjects(form.websiteId).then(({ data }) => setProjects(data.projects)).catch(() => {})
  }, [form.websiteId, editing])

  const handleSave = async () => {
    setSaving(true); setSaveErr('')
    try {
      const payload = { ...form }
      Object.keys(payload).forEach((k) => { if (payload[k] === '') payload[k] = null })
      await updateTask(id, payload)
      await fetchTask(); fetchActivity()
      setEditing(false)
    } catch (err) { setSaveErr(err.response?.data?.message || 'Failed to save.') }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (newStatus) => {
    if (task.status === newStatus || statusSaving) return
    setStatusSaving(true)
    try { await updateTask(id, { status: newStatus }); setTask((p) => ({ ...p, status: newStatus })); fetchActivity() }
    catch {}
    finally { setStatusSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete "${task.title}"? This cannot be undone.`)) return
    try { await deleteTask(id); navigate('/tasks') } catch {}
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setCommentSaving(true)
    try { await addComment(id, commentText.trim()); setCommentText(''); fetchComments(); fetchActivity() }
    catch {}
    finally { setCommentSaving(false) }
  }

  const handleDeleteComment = async (cId) => {
    if (!confirm('Delete this comment?')) return
    try { await deleteComment(id, cId); fetchComments() } catch {}
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
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {editing && (
            <>
              <button onClick={() => { setEditing(false); setForm(taskToForm(task)) }} className="btn-secondary flex items-center gap-2">
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
            {CATEGORIES.find((c) => c.value === task.category)?.label || task.category}
          </span>
          {task.tags && task.tags.split(',').map((t) => (
            <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{t.trim()}</span>
          ))}
        </div>

        {/* Workflow */}
        {!editing && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Workflow</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FLOW.map((s, i) => {
                const currentIdx = STATUS_FLOW.indexOf(task.status)
                const isCurrent  = s === task.status
                const isPast     = i < currentIdx
                return (
                  <button key={s} onClick={() => handleStatusChange(s)} disabled={statusSaving}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      isCurrent ? 'bg-blue-600 text-white shadow-sm' :
                      isPast    ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' :
                                  'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-blue-50 hover:text-blue-600'
                    }`}>
                    {STATUS_LABELS[s]}
                  </button>
                )
              })}
              {task.status !== 'cancelled' && (
                <button onClick={() => handleStatusChange('cancelled')} disabled={statusSaving}
                  className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-50 text-gray-400 border border-gray-200 hover:bg-red-50 hover:text-red-500 transition-colors ml-1">
                  Cancel Task
                </button>
              )}
            </div>
          </div>
        )}
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
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-blue-500" />SEO Details</h3>
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Target URL</label><input type="text" value={form.targetUrl} onChange={f('targetUrl')} className="input-field" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Target Keywords</label><input type="text" value={form.targetKeywords} onChange={f('targetKeywords')} className="input-field" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Search Intent</label>
                    <select value={form.searchIntent} onChange={f('searchIntent')} className="input-field">
                      <option value="">Select…</option>
                      {['Informational','Navigational','Transactional','Commercial'].map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Current Rank</label><input type="number" value={form.currentRanking} onChange={f('currentRanking')} className="input-field" placeholder="#" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Target Rank</label><input type="number" value={form.targetRanking} onChange={f('targetRanking')} className="input-field" placeholder="#" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Tools Used</label><input type="text" value={form.toolsUsed} onChange={f('toolsUsed')} className="input-field" /></div>
                  <div><label className="block text-xs font-medium text-gray-500 mb-1">Tags</label><input type="text" value={form.tags} onChange={f('tags')} className="input-field" /></div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {task.targetUrl && (
                  <div className="flex items-start gap-2"><span className="text-xs text-gray-400 w-32 flex-shrink-0 pt-0.5">Target URL</span>
                    <a href={task.targetUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all">
                      {task.targetUrl}<ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                )}
                {task.targetKeywords && <div className="flex items-start gap-2"><span className="text-xs text-gray-400 w-32 flex-shrink-0">Keywords</span><span className="text-sm text-gray-700">{task.targetKeywords}</span></div>}
                {task.searchIntent && <div className="flex items-center gap-2"><span className="text-xs text-gray-400 w-32 flex-shrink-0">Search Intent</span><span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{task.searchIntent}</span></div>}
                {(task.currentRanking || task.targetRanking) && (
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-400 w-32 flex-shrink-0">Ranking</span>
                    <span className="text-sm text-gray-700">{task.currentRanking ? `#${task.currentRanking}` : '?'}{task.targetRanking ? ` → #${task.targetRanking}` : ''}</span>
                  </div>
                )}
                {task.toolsUsed && <div className="flex items-start gap-2"><span className="text-xs text-gray-400 w-32 flex-shrink-0">Tools Used</span><span className="text-sm text-gray-700">{task.toolsUsed}</span></div>}
                {!task.targetUrl && !task.targetKeywords && !task.searchIntent && !task.currentRanking && !task.toolsUsed && (
                  <p className="text-sm text-gray-400 italic">No SEO details added.</p>
                )}
              </div>
            )}
          </div>

          {/* GSC Metrics */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-green-500" />GSC Metrics</h3>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                {[['gscImpressionsBefore','Impressions Before'],['gscImpressionsAfter','Impressions After'],
                  ['gscClicksBefore','Clicks Before'],['gscClicksAfter','Clicks After'],['backlinksCount','Backlinks']].map(([key, label]) => (
                  <div key={key}><label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                    <input type="number" value={form[key]} onChange={f(key)} className="input-field" placeholder="0" /></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Impressions', before: task.gscImpressionsBefore, after: task.gscImpressionsAfter },
                  { label: 'Clicks',      before: task.gscClicksBefore,      after: task.gscClicksAfter },
                ].map(({ label, before, after }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-2">{label}</p>
                    <div className="flex items-end gap-3">
                      <div><p className="text-xs text-gray-400">Before</p><p className="text-lg font-bold text-gray-700">{before?.toLocaleString() ?? '—'}</p></div>
                      <span className="text-gray-300 mb-1">→</span>
                      <div><p className="text-xs text-gray-400">After</p>
                        <p className={`text-lg font-bold ${after > before ? 'text-green-600' : after < before ? 'text-red-500' : 'text-gray-700'}`}>{after?.toLocaleString() ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {task.backlinksCount != null && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Backlinks</p>
                    <p className="text-lg font-bold text-gray-700">{task.backlinksCount}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Expected Result</h3>
              {editing
                ? <textarea value={form.expectedResult} onChange={f('expectedResult')} className="input-field" rows={2} />
                : <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.expectedResult || <span className="italic text-gray-400">Not specified.</span>}</p>
              }
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Actual Result</h3>
              {editing
                ? <textarea value={form.actualResult} onChange={f('actualResult')} className="input-field" rows={2} placeholder="Fill in once completed…" />
                : <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.actualResult || <span className="italic text-gray-400">Not filled yet.</span>}</p>
              }
            </div>
          </div>

          {/* Comments + Activity */}
          <div className="card">
            <div className="border-b border-gray-100 flex">
              {[
                { key: 'comments', Icon: MessageSquare, label: `Comments (${comments.length})` },
                { key: 'activity', Icon: Activity,      label: `Activity (${activity.length})` },
              ].map(({ key, Icon, label }) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon className="w-4 h-4" />{label}
                </button>
              ))}
            </div>

            {tab === 'comments' && (
              <div className="p-4 space-y-4">
                {comments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {c.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-900">{c.user.name}</span>
                        <span className="text-xs text-gray-400">{fmtTime(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                    </div>
                    {(isAdmin || c.user.id === user?.id) && (
                      <button onClick={() => handleDeleteComment(c.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <form onSubmit={handleComment} className="flex gap-3 pt-2 border-t border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <textarea ref={commentRef} value={commentText} onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e) } }}
                      className="input-field flex-1 resize-none" rows={2} placeholder="Write a comment… (Enter to send)" />
                    <button type="submit" disabled={commentSaving || !commentText.trim()} className="btn-primary px-3 self-end">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {tab === 'activity' && (
              <div className="p-4">
                {activity.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No activity yet.</p>}
                <div className="space-y-3">
                  {activity.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">{a.user.name}</span>{' '}
                          {(ACTIVITY_LABELS[a.action] || (() => a.action))(a)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtTime(a.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
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
                {(isAdmin || isManager) && (
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
                  { label:'Category', value: CATEGORIES.find((c) => c.value === task.category)?.label }].map(({ label, value }) => (
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
                <div className="flex items-center justify-between"><dt className="text-xs text-gray-400">Start</dt><dd className="text-sm text-gray-700">{fmt(task.startDate)}</dd></div>
                <div className="flex items-center justify-between"><dt className="text-xs text-gray-400">Due</dt>
                  <dd className={`text-sm font-medium ${task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500' : 'text-gray-700'}`}>{fmt(task.dueDate)}</dd>
                </div>
                <div className="flex items-center justify-between"><dt className="text-xs text-gray-400">Created</dt><dd className="text-sm text-gray-700">{fmt(task.createdAt)}</dd></div>
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
      </div>
    </div>
  )
}
