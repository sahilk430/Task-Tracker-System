// `f(key)` returns an onChange handler that writes into `form[key]`
export default function TaskResults({ task, editing, form, f }) {
  return (
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
  )
}
