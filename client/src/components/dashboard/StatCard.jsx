// Renders as a <button> when clickable so it is keyboard-accessible
export default function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`card p-5 flex items-center gap-4 text-left w-full ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300 transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500' : ''
      }`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Tag>
  )
}
