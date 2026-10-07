import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Send, MessageSquare, Activity } from 'lucide-react'
import { addComment, deleteComment } from '../../api/tasks'
import { useTaskComments, useTaskActivity } from '../../hooks/queries'
import { useUser } from '../../hooks/useAuth'
import { ADMIN_ROLES, STATUS_LABELS, PRIORITY_LABELS } from '../../utils/constants'
import { fmtDateTime } from '../../utils/format'

const ACTIVITY_LABELS = {
  status_changed:   (a) => `moved to ${STATUS_LABELS[a.newValue] || a.newValue}`,
  priority_changed: (a) => `changed priority to ${PRIORITY_LABELS[a.newValue] || a.newValue}`,
  reassigned:       ()  => 'reassigned the task',
  commented:        ()  => 'left a comment',
}

// Comments + activity tabs for a task
export default function TaskDiscussion({ taskId }) {
  const user    = useUser()
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const queryClient = useQueryClient()

  const [tab, setTab]                 = useState('comments')
  const [commentText, setCommentText] = useState('')

  const { data: comments = [] } = useTaskComments(taskId)
  const { data: activity = [] } = useTaskActivity(taskId)

  const postComment = useMutation({
    mutationFn: (body) => addComment(taskId, body),
    onSuccess:  () => {
      setCommentText('')
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId, 'comments'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId, 'activity'] })
    },
  })
  const commentSaving = postComment.isPending

  const removeComment = useMutation({
    mutationFn: (cId) => deleteComment(taskId, cId),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId, 'comments'] }),
  })

  const handleComment = (e) => {
    e.preventDefault()
    if (!commentText.trim() || commentSaving) return
    postComment.mutate(commentText.trim())
  }

  const handleDeleteComment = (cId) => {
    if (!confirm('Delete this comment?')) return
    removeComment.mutate(cId)
  }

  return (
    <div className="card">
      <div className="border-b border-gray-100 flex">
        {[
          { key: 'comments', Icon: MessageSquare, label: `Comments (${comments.length})` },
          { key: 'activity', Icon: Activity,      label: `Activity (${activity.length})` },
        ].map(({ key, Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'comments' && (
        <div className="p-4 space-y-4">
          {comments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {c.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900">{c.user.name}</span>
                  <span className="text-xs text-gray-400">{fmtDateTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
              {(isAdmin || c.user.id === user?.id) && (
                <button onClick={() => handleDeleteComment(c.id)}
                  className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <form onSubmit={handleComment} className="flex gap-3 pt-2 border-t border-gray-100">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 flex gap-2">
              <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e) } }}
                className="input-field flex-1 resize-none" rows={2} placeholder="Write a comment… (Enter to send)" />
              <button type="submit" disabled={commentSaving || !commentText.trim()} className="btn-primary px-3 self-end">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === 'activity' && (
        <div className="p-4">
          {activity.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No activity yet.</p>}
          <div className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{a.user.name}</span>{' '}
                    {(ACTIVITY_LABELS[a.action] || (() => a.action))(a)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
