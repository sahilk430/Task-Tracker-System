import { useEffect, useState } from 'react'
import { UserPlus, Search, Edit2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { getUsers, createUser, updateUser, toggleUserActive } from '../api/users'
import { ROLE_LABELS, ROLE_BADGE_COLORS, VALID_ROLES } from '../utils/constants'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'seo_executive' }

export default function Users() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [saving, setSaving]         = useState(false)
  const [formError, setFormError]   = useState('')

  const fetchUsers = () => {
    setLoading(true)
    const params = {}
    if (search)     params.search = search
    if (roleFilter) params.role   = roleFilter
    getUsers(params)
      .then(({ data }) => setUsers(data.users))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchUsers() }, [search, roleFilter])

  const openAdd = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setShowModal(true) }
  const openEdit = (u) => { setEditing(u); setForm({ name: u.name, email: u.email, password: '', role: u.role }); setFormError(''); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null); setFormError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('')
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role }
        if (form.password) payload.password = form.password
        await updateUser(editing.id, payload)
      } else {
        await createUser(form)
      }
      closeModal(); fetchUsers()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong.')
    } finally { setSaving(false) }
  }

  const handleToggle = async (u) => {
    try { await toggleUserActive(u.id); fetchUsers() } catch {}
  }

  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name or email…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" />
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field w-44">
            <option value="">All roles</option>
            {VALID_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(5)].map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td>
                  ))}</tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No users found.</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full border font-medium ${ROLE_BADGE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{fmt(u.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggle(u)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        {u.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{editing ? 'Edit User' : 'Add New User'}</h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{formError}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm(f => ({...f, name: e.target.value}))} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm(f => ({...f, email: e.target.value}))} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password {editing && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm(f => ({...f, password: e.target.value}))}
                  className="input-field" minLength={6} required={!editing} placeholder={editing ? '••••••' : ''} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm(f => ({...f, role: e.target.value}))} className="input-field">
                  {VALID_ROLES.filter(r => r !== 'client').map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editing ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
