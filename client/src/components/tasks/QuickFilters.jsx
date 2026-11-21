import { QUICK_FILTERS } from '../../utils/constants'

export default function QuickFilters({ value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mb-1" role="tablist" aria-label="Quick filters">
      {QUICK_FILTERS.map((q) => (
        <button key={q.value} type="button" role="tab" aria-selected={value === q.value}
          onClick={() => onChange(q.value)}
          className={`text-sm px-3 py-1.5 rounded-lg border whitespace-nowrap transition-colors ${
            value === q.value
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900'
          }`}>
          {q.label}
        </button>
      ))}
    </div>
  )
}
