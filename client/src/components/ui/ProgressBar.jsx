// Completion bar; `value` is a 0–100 percentage
export default function ProgressBar({ value = 0, className = '' }) {
  const pct = Math.max(0, Math.min(100, value || 0))
  return (
    <div className={`h-1.5 bg-gray-100 rounded-full overflow-hidden ${className}`}
      role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
    </div>
  )
}
