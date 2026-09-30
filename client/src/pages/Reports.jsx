import { useEffect, useState } from 'react'
import { Download, Filter, BarChart2, Globe, CheckSquare, AlertTriangle, Clock } from 'lucide-react'
import { getTaskReport, getWebsiteReport } from '../api/reports'
import { getWebsites } from '../api/websites'
import { getUsers } from '../api/users'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../utils/constants'

const CATEGORIES = [
  { value: 'on_page',   label: 'On-Page SEO' },
  { value: 'off_page',  label: 'Off-Page SEO' },
  { value: 'technical', label: 'Technical SEO' },
  { value: 'content',   label: 'Content' },
  { value: 'research',  label: 'Research' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other',     label: 'Other' },
]

const PRIORITY_DOT = { critical:'bg-red-500', high:'bg-orange-500', medium:'bg-yellow-400', low:'bg-green-500' }

function exportCSV(tasks) {
  const headers = [
    'Title','Status','Priority','Category','Website','Project',
    'Assigned To','Due Date','Created At','Est. Hours','Actual Hours',
    'Target URL','Target Keywords','Search Intent',
    'Current Rank','Target Rank','Tools Used','Tags',
    'Expected Result','Actual Result',
  ]
  const esc = (v) => (v == null ? '' : String(v).replace(/"/g, '""'))
  const rows = tasks.map((t) => [
    esc(t.title),
    esc(STATUS_LABELS[t.status]   || t.status),
    esc(PRIORITY_LABELS[t.priority] || t.priority),
    esc(CATEGORIES.find((c) => c.value === t.category)?.label || t.category),
    esc(t.website?.name), esc(t.project?.name),
    esc(t.assignee?.name),
    esc(t.dueDate   ? new Date(t.dueDate).toLocaleDateString()   : ''),
    esc(t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''),
    esc(t.estimatedHours), esc(t.actualHours),
    esc(t.targetUrl), esc(t.targetKeywords), esc(t.searchIntent),
    esc(t.currentRanking), esc(t.targetRanking),
    esc(t.toolsUsed), esc(t.tags),
    esc(t.expectedResult), esc(t.actualResult),
  ])
  const csv  = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `tasks-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

export default function Reports() {
  const [tab, setTab] = useState('tasks')

  const [tasks, setTasks]     = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [websites, setWebsites] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [filters, setFilters]   = useState({
    dateFrom: '', dateTo: '', dateField: 'createdAt',
    websiteId: '', status: '', priority: '', category: '', assignedTo: '',
  })

  const [siteData, setSiteData]       = useState([])
  const [siteLoading, setSiteLoading] = useState(false)

  useEffect(() => {
    getWebsites().then(({ data }) => setWebsites(data.websites)).catch(() => {})
    getUsers().then(({ data }) => setAllUsers(data.users)).catch(() => {})
    runReport()
  }, [])

  useEffect(() => {
    if (tab === 'websites' && siteData.length === 0) {
      setSiteLoading(true)
      getWebsiteReport().then(({ data }) => setSiteData(data.websites)).catch(() => {}).finally(() => setSiteLoading(false))
    }
  }, [tab])

  const runReport = (overrideFilters) => {
    setLoading(true)
    const f = overrideFilters ?? filters
    const params = {}
    Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v })
    getTaskReport(params)
      .then(({ data }) => { setTasks(data.tasks); setSummary(data.summary) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const clearFilters = () => {
    const blank = { dateFrom:'', dateTo:'', dateField:'createdAt', websiteId:'', status:'', priority:'', category:'', assignedTo:'' }
    setFilters(blank)
    runReport(blank)
  }

  const sf = (key) => (e) => setFilters((p) => ({ ...p, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="border-b border-gray-200 flex gap-6">
        {[
          { key: 'tasks',    Icon: CheckSquare, label: 'Tasks Report' },
          { key: 'websites', Icon: Globe,       label: 'Websites Report' },
        ].map(({ key, Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Tasks Report */}
      {tab === 'tasks' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="card p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filters
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
                <input type="date" value={filters.dateFrom} onChange={sf('dateFrom')} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
                <input type="date" value={filters.dateTo} onChange={sf('dateTo')} className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date Field</label>
                <select value={filters.dateField} onChange={sf('dateField')} className="input-field">
                  <option value="createdAt">Created At</option>
                  <option value="dueDate">Due Date</option>
                  <option value="updatedAt">Updated At</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Website</label>
                <select value={filters.websiteId} onChange={sf('websiteId')} className="input-field">
                  <option value="">All Websites</option>
                  {websites.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select value={filters.status} onChange={sf('status')} className="input-field">
                  <option value="">All Statuses</option>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                <select value={filters.priority} onChange={sf('priority')} className="input-field">
                  <option value="">All Priorities</option>
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select value={filters.category} onChange={sf('category')} className="input-field">
                  <option value="">All Categories</option>
                  {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assignee</label>
                <select value={filters.assignedTo} onChange={sf('assignedTo')} className="input-field">
                  <option value="">All Members</option>
                  {allUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-gray-600">Clear filters</button>
              <button onClick={() => runReport()} disabled={loading} className="btn-primary flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />{loading ? 'Running…' : 'Run Report'}
              </button>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard icon={CheckSquare}   label="Total Tasks"         value={summary.total}               color="bg-blue-500" />
              <SummaryCard icon={CheckSquare}   label="Completed"           value={summary.done}                color="bg-green-500" />
              <SummaryCard icon={AlertTriangle} label="Overdue"             value={summary.overdue}             color={summary.overdue > 0 ? 'bg-red-500' : 'bg-gray-400'} />
              <SummaryCard icon={Clock}         label="Est. / Actual Hours" value={`${summary.totalEstimatedHours}h / ${summary.totalActualHours}h`} color="bg-indigo-500" />
            </div>
          )}

          {/* Table */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">{tasks.length} task{tasks.length !== 1 ? 's' : ''} found</p>
              <button onClick={() => exportCSV(tasks)} disabled={tasks.length === 0}
                className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1,2,3,4,5].map((i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center">
                <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No tasks match your filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Title','Status','Priority','Category','Website','Assignee','Due Date','Est.','Actual','Keywords'].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tasks.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">{t.title}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                            {STATUS_LABELS[t.status] || t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[t.priority] || 'bg-gray-300'}`} />
                            <span className="text-xs text-gray-600">{PRIORITY_LABELS[t.priority] || t.priority}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                          {CATEGORIES.find((c) => c.value === t.category)?.label || t.category}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{t.website?.name || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{t.assignee?.name || '—'}</td>
                        <td className={`px-4 py-3 whitespace-nowrap text-xs ${t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done' ? 'text-red-500 font-medium' : 'text-gray-600'}`}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{t.estimatedHours != null ? `${t.estimatedHours}h` : '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{t.actualHours != null ? `${t.actualHours}h` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">{t.targetKeywords || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Websites Report */}
      {tab === 'websites' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Website Performance Overview</p>
          </div>
          {siteLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}</div>
          ) : siteData.length === 0 ? (
            <div className="p-12 text-center">
              <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No websites found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['Website','Domain','Status','Total Tasks','Done','In Progress','Overdue','Completion'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {siteData.map((w) => {
                    const pct = w.totalTasks ? Math.round((w.done / w.totalTasks) * 100) : 0
                    return (
                      <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">{w.name}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{w.domain}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            w.status === 'active' ? 'bg-green-100 text-green-700' :
                            w.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                          }`}>{w.status.charAt(0).toUpperCase() + w.status.slice(1)}</span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-700">{w.totalTasks}</td>
                        <td className="px-4 py-3 font-medium text-green-600">{w.done}</td>
                        <td className="px-4 py-3 font-medium text-yellow-600">{w.inProgress}</td>
                        <td className={`px-4 py-3 font-medium ${w.overdue > 0 ? 'text-red-500' : 'text-gray-400'}`}>{w.overdue}</td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
