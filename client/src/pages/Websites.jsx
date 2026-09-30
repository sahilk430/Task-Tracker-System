import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Globe, ExternalLink, Edit2, Archive, X } from 'lucide-react'
import { getWebsites, createWebsite, updateWebsite, archiveWebsite } from '../api/websites'
import useAuthStore from '../store/authStore'
import { ADMIN_ROLES } from '../utils/constants'

const CMS_OPTIONS = ['WordPress','Shopify','Webflow','Wix','Squarespace','Custom','Other']
const STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  paused:    'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-gray-100 text-gray-500',
}
const EMPTY = { name:'', domain:'', cmsPlatform:'', industry:'', ga4PropertyId:'', gscProperty:'', clientName:'', clientEmail:'', notes:'', status:'active' }

export default function Websites() {
  const user    = useAuthStore((s) => s.user)
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const navigate = useNavigate()

  const [websites, setWebsites]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState('')

  const fetchWebsites = () => {
    setLoading(true)
    getWebsites().then(({ data }) => setWebsites(data.websites)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { fetchWebsites() }, [])

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setFormError(''); setShowModal(true) }
  const openEdit = (w) => {
    setEditing(w)
    setForm({ name: w.name, domain: w.domain, cmsPlatform: w.cmsPlatform||'', industry: w.industry||'',
      ga4PropertyId: w.ga4PropertyId||'', gscProperty: w.gscProperty||'',
      clientName: w.clientName||'', clientEmail: w.clientEmail||'', notes: w.notes||'', status: w.status })
    setFormError(''); setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditing(null); setFormError('') }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setFormError('')
    try {
      editing ? await updateWebsite(editing.id, form) : await createWebsite(form)
      closeModal(); fetchWebsites()
    } catch (err) { setFormError(err.response?.data?.message || 'Something went wrong.') }
    finally { setSaving(false) }
  }

  const handleArchive = async (w, e) => {
    e.stopPropagation()
    if (!confirm(`Archive "${w.name}"?`)) return
    try { await archiveWebsite(w.id); fetchWebsites() } catch {}
  }

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{websites.length} website{websites.length !== 1 ? 's' : ''}</p>
        {isAdmin && (
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Website
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="card h-40 animate-pulse bg-gray-100" />)}
        </div>
      ) : websites.length === 0 ? (
        <div className="card p-12 text-center">
          <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No websites yet</p>
          {isAdmin && <p className="text-sm text-gray-400 mt-1">Click "Add Website" to get started.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {websites.map((w) => (
            <div key={w.id} onClick={() => navigate(`/websites/${w.id}`)}
              className="card p-5 hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{w.name}</p>
                    <a href={`https://${w.domain}`} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-gray-500 hover:text-blue-500 flex items-center gap-1">
                      {w.domain} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_BADGE[w.status] || STATUS_BADGE.active}`}>
                  {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {w.cmsPlatform && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{w.cmsPlatform}</span>}
                {w.industry    && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{w.industry}</span>}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{w._count?.tasks || 0} tasks</span>
                  <span>{w._count?.projects || 0} projects</span>
                  <span>{w.members?.length || 0} members</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(w) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={(e) => handleArchive(w, e)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500"><Archive className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="font-semibold text-gray-900">{editing ? 'Edit Website' : 'Add New Website'}</h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-4 h-4 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website Name *</label>
                  <input type="text" value={form.name} onChange={f('name')} className="input-field" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
                  <input type="text" value={form.domain} onChange={f('domain')} className="input-field" placeholder="example.com" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CMS Platform</label>
                  <select value={form.cmsPlatform} onChange={f('cmsPlatform')} className="input-field">
                    <option value="">Select…</option>
                    {CMS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input type="text" value={form.industry} onChange={f('industry')} className="input-field" placeholder="e.g. E-commerce" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input type="text" value={form.clientName} onChange={f('clientName')} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                  <input type="email" value={form.clientEmail} onChange={f('clientEmail')} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GA4 Property ID</label>
                  <input type="text" value={form.ga4PropertyId} onChange={f('ga4PropertyId')} className="input-field" placeholder="G-XXXXXXXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSC Property</label>
                  <input type="text" value={form.gscProperty} onChange={f('gscProperty')} className="input-field" placeholder="sc-domain:example.com" />
                </div>
                {editing && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select value={form.status} onChange={f('status')} className="input-field">
                      {['active','paused','completed'].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                    </select>
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={f('notes')} className="input-field" rows={3} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : editing ? 'Update Website' : 'Add Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
