export default function BarChart({ data, colors = {}, labels = {}, total }) {
  if (!total) return <p className="text-sm text-gray-400 italic">No data yet.</p>
  return (
    <div className="space-y-2">
      {Object.entries(data).map(([key, count]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-24 flex-shrink-0 truncate">{labels[key] || key}</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colors[key] || 'bg-blue-400'}`}
              style={{ width: `${Math.round((count / total) * 100)}%` }} />
          </div>
          <span className="text-xs font-medium text-gray-700 w-8 text-right">{count}</span>
        </div>
      ))}
    </div>
  )
}
