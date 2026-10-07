import { STATUS_FLOW, STATUS_LABELS } from '../../utils/constants'

export default function TaskWorkflow({ status, onChange, disabled }) {
  return (
    <div className="pt-3 border-t border-gray-100">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Workflow</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FLOW.map((s, i) => {
          const currentIdx = STATUS_FLOW.indexOf(status)
          const isCurrent  = s === status
          const isPast     = i < currentIdx
          return (
            <button key={s} onClick={() => onChange(s)} disabled={disabled}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                isCurrent ? 'bg-blue-600 text-white shadow-sm' :
                isPast    ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' :
                            'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-blue-50 hover:text-blue-600'
              }`}>
              {STATUS_LABELS[s]}
            </button>
          )
        })}
        {status !== 'cancelled' && (
          <button onClick={() => onChange('cancelled')} disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-lg font-medium bg-gray-50 text-gray-400 border border-gray-200 hover:bg-red-50 hover:text-red-500 transition-colors ml-1">
            Cancel Task
          </button>
        )}
      </div>
    </div>
  )
}
