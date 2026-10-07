import { BarChart2 } from 'lucide-react'

// `f(key)` returns an onChange handler that writes into `form[key]`
export default function TaskGscMetrics({ task, editing, form, f }) {
  return (
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
  )
}
