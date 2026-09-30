import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Globe, Users, FolderOpen, Edit2, Trash2, X, UserPlus, UserMinus, ExternalLink } from 'lucide-react'
import { getWebsite, addWebsiteMember, removeWebsiteMember } from '../api/websites'
import { getProjects, createProject, deleteProject } from '../api/projects'
import { getUsers } from '../api/users'
import useAuthStore from '../store/authStore'
import { ADMIN_ROLES, STATUS_COLORS, STATUS_LABELS, ROLE_LABELS, ROLE_BADGE_COLORS } from '../utils/constants'

const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  paused:    'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-gray-100 text-gray-500',
}

const PROJ_EMPTY = { name: '', goal: '', startDate: '', endDate: '', status: 'active' }

export default function WebsiteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = ADMIN_ROLES.includes(user?.role)

  const [website, setWebsite]       = useState(null)
  const [projects, setProjects]     = useState([])
  const [allUsers, setAllUsers]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('projects')

  // Project modal
  const [showProjModal, setShowProjModal] = useState(false)
  const [projForm, setProjForm]           = useState(PROJ_EMPTY)
  const [projSaving, setProjSaving]       = useState(false)
  const [projError, setProjError]         = useState('')

  // Member modal
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [selectedUserId, setSelectedUserId]   = useState('')
  const [memberSaving, setMemberSaving]       = useState(false)
  const [memberError, setMemberError]         = useState('')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [wRes, pRes] = await Promise.all([getWebsite(id), getProjects(id)])
      setWebsite(wRes.data.website)
      setProjects(pRes.data.projects)
    } catch {
      navigate('/websites')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [id])

  useEffect(() => {
    if (isAdmin && tab === 'members') {
      getUsers().then(({ data }) => setAllUsers(data.users)).catch(() => {})
    }
  }, [isAdmin, tab])

  // Project handlers
  const handleAddProject = async (e) => {
    e.preventDefault(); setProjSaving(true); setProjError('')
    try {
      await createProject({ websiteId: id, ...projForm })
      setShowProjModal(false); setProjForm(PROJ_EMPTY); fetchAll()
    } catch (err) { setProjError(err.response?.data?.message || 'Something went wrong.') }
    finally { setProjSaving(false) }
  }

  const handleDeleteProject = async (proj) => {
    if (!confirm(`Delete project "${proj.name}"? This cannot be undone.`)) return
    try { await deleteProject(proj.id); fetchAll() } catch {}
  }

  // Member handlers
  const existingIds = website?.members?.map((m) => m.user.id) || []
  const availableUsers = allUsers.filter((u) => !existingIds.includes(u.id))

  const handleAddMember = async (e) => {
    e.preventDefault(); setMemberSaving(true); setMemberError('')
    try {
      await addWebsiteMember(id, selectedUserId)
      setShowMemberModal(false); setSelectedUserId(''); fetchAll()
    } catch (err) { setMemberError(err.response?.data?.message || 'Something went wrong.') }
    finally { setMemberSaving(false) }
  }

  const handleRemoveMember = async (userId, name) => {
    if (!confirm(`Remove ${name} from this website?`)) return
    try { await removeWebsiteMember(id, userId); fetchAll() } catch {}
  }

  const fp = (key) => (e) => setProjForm((p) => ({ ...p, [key]: e.target.value }))

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
      <div className="card h-32 animate-pulse bg-gray-100" />
    </div>
  )

  if (!website) return null

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <button onClick={() => navigate('/websites')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Websites
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Globe className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{website.name}</h1>
              <a href={`https://${website.domain}`} target="_blank" rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-blue-500 flex items-center gap-1">
                {website.domain} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_BADGE[website.status] || STATUS_BADGE.active}`}>
            {website.status.charAt(0).toUpperCase() + website.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'CMS', value: website.cmsPlatform || '—' },
          { label: 'Industry', value: website.industry || '—' },
          { label: 'Client', value: website.clientName || '—' },
          { label: 'GA4 Property', value: website.ga4PropertyId || '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
          </div>
        ))}
      </div>

      {website.notes && (
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{website.notes}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'projects', icon: FolderOpen, label: 'Projects', count: projects.length },
            { key: 'members',  icon: Users,      label: 'Team Members', count: website.members?.length || 0 },
          ].map(({ key, icon: Icon, label, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                {count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Projects Tab */}
      {tab === 'projects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
            {isAdmin && (
              <button onClick={() => { setProjForm(PROJ_EMPTY); setProjError(''); setShowProjModal(true) }}
                className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Project
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="card p-10 text-center">
              <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No projects yet</p>
              {isAdmin && <p className="text-sm text-gray-400 mt-1">Click "Add Project" to get started.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div key={p.id} className="card p-5 group">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status] || STATUS_BADGE.active}`}>
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                      {isAdmin && (
                        <button onClick={() => handleDeleteProject(p)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {p.goal && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.goal}</p>}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{p._count?.tasks || 0} tasks</span>
                    {p.endDate && (
                      <span>Due {new Date(p.endDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{website.members?.length || 0} member{(website.members?.length || 0) !== 1 ? 's' : ''}</p>
            {isAdmin && (
              <button onClick={() => { setSelectedUserId(''); setMemberError(''); setShowMemberModal(true) }}
                className="btn-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Add Member
              </button>
            )}
          </div>

          {(!website.members || website.members.length === 0) ? (
            <div className="card p-10 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No members assigned</p>
              {isAdmin && <p className="text-sm text-gray-400 mt-1">Click "Add Member" to assign team members.</p>}
            </div>
          ) : (
            <div className="card divide-y divide-gray-100">
              {website.members.map(({ user: m }) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE_COLORS[m.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[m.role] || m.role}
                    </span>
                    {isAdmin && (
                      <button onClick={() => handleRemoveMember(m.id, m.name)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Project Modal */}
      {showProjModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Add New Project</h2>
              <button onClick={() => setShowProjModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              {projError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{projError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                <input type="text" value={projForm.name} onChange={fp('name')} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal / Description</label>
                <textarea value={projForm.goal} onChange={fp('goal')} className="input-field" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={projForm.startDate} onChange={fp('startDate')} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={projForm.endDate} onChange={fp('endDate')} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowProjModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={projSaving} className="btn-primary flex-1">
                  {projSaving ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Add Team Member</h2>
              <button onClick={() => setShowMemberModal(false)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              {memberError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{memberError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select User</label>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="input-field" required>
                  <option value="">Choose a team member…</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role] || u.role})</option>
                  ))}
                </select>
                {availableUsers.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">All users are already members of this website.</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMemberModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={memberSaving || !selectedUserId} className="btn-primary flex-1">
                  {memberSaving ? 'Adding…' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
