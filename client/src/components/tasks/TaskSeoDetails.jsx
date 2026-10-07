import { Target, ExternalLink } from 'lucide-react'

// `f(key)` returns an onChange handler that writes into `form[key]`
export default function TaskSeoDetails({ task, editing, form, f }) {
  return (
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
  )
}
