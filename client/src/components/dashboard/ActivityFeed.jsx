import { Link } from 'react-router-dom'
import { STATUS_LABELS, PRIORITY_LABELS } from '../../utils/constants'
import { fmtDateTime } from '../../utils/format'

const taskLink = (a) => a.task
  ? <Link to={`/tasks/${a.task.id}`} className="font-medium text-gray-900 hover:text-blue-600">“{a.task.title}”</Link>
  : <span className="italic text-gray-400">a deleted task</span>

const name = (n) => <span className="font-medium text-gray-900">{n}</span>

// The sentence after the actor's name, per logged action
const DESCRIBE = {
  created: (a) => <>created {taskLink(a)}{a.newValueName && <> and assigned it to {name(a.newValueName)}</>}</>,
  status_changed: (a) => a.newValue === 'done'
    ? <>completed {taskLink(a)}</>
    : <>moved {taskLink(a)} to {STATUS_LABELS[a.newValue] || a.newValue}</>,
  priority_changed: (a) => <>changed priority of {taskLink(a)} to {PRIORITY_LABELS[a.newValue] || a.newValue}</>,
  reassigned: (a) => <>reassigned {taskLink(a)}{a.newValueName && <> to {name(a.newValueName)}</>}</>,
  commented:  (a) => <>commented on {taskLink(a)}</>,
  attached:   (a) => <>attached {a.newValue ? name(a.newValue) : 'a file'} to {taskLink(a)}</>,
}

const DOT = {
  created: 'bg-blue-500', status_changed: 'bg-yellow-500', priority_changed: 'bg-orange-400',
  reassigned: 'bg-purple-500', commented: 'bg-gray-400',
}
const dotFor = (a) => (a.action === 'status_changed' && a.newValue === 'done' ? 'bg-green-500' : DOT[a.action] || 'bg-gray-400')

export default function ActivityFeed({ items = [], loading }) {
  if (loading) {
    return <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />)}</div>
  }
  if (!items.length) return <p className="text-sm text-gray-400 py-4 text-center">No activity yet.</p>

  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="flex items-start gap-2.5">
          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotFor(a)}`} />
          <div className="min-w-0">
            <p className="text-sm text-gray-600 leading-snug break-words">
              {name(a.user?.name || 'Someone')}{' '}
              {(DESCRIBE[a.action] || ((x) => x.action))(a)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(a.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
