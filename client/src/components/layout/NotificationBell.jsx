import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, UserPlus, RefreshCw, MessageSquare, AtSign, CalendarClock, AlertTriangle, ListChecks, CheckCheck } from 'lucide-react'
import { useNotifications } from '../../hooks/queries'
import { markNotificationRead, markAllNotificationsRead } from '../../api/notifications'
import { timeAgo } from '../../utils/format'

const TYPE_ICONS = {
  assigned: [UserPlus,      'text-blue-600 bg-blue-50'],
  status:   [RefreshCw,     'text-purple-600 bg-purple-50'],
  comment:  [MessageSquare, 'text-gray-600 bg-gray-100'],
  mention:  [AtSign,        'text-amber-600 bg-amber-50'],
  due_soon: [CalendarClock, 'text-orange-600 bg-orange-50'],
  overdue:  [AlertTriangle, 'text-red-600 bg-red-50'],
  digest:   [ListChecks,    'text-green-600 bg-green-50'],
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data } = useNotifications()
  const notifications = data?.notifications ?? []
  const unread = data?.unread ?? 0

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh })
  const markAll  = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh })

  const openNotification = (n) => {
    if (!n.read) markRead.mutate(n.id)
    setOpen(false)
    if (n.task?.id) navigate(`/tasks/${n.task.id}`)
    else if (n.type === 'digest') navigate('/tasks?view=overdue')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Notifications</p>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-[26rem] overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-gray-400">You're all caught up.</li>
              )}
              {notifications.map((n) => {
                const [Icon, tone] = TYPE_ICONS[n.type] || TYPE_ICONS.comment
                return (
                  <li key={n.id}>
                    <button onClick={() => openNotification(n)}
                      className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 ${n.read ? '' : 'bg-blue-50/40'}`}>
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tone}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>{n.title}</span>
                        {n.body && <span className="block text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</span>}
                        <span className="block text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" aria-label="Unread" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
