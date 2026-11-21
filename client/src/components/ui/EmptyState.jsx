export default function EmptyState({ icon: Icon, title, message, action, compact = false }) {
  return (
    <div className={`text-center ${compact ? 'py-6' : 'py-12'}`}>
      {Icon && <Icon className={`${compact ? 'w-7 h-7' : 'w-10 h-10'} text-gray-300 mx-auto mb-3`} />}
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {message && <p className="text-sm text-gray-400 mt-1">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
