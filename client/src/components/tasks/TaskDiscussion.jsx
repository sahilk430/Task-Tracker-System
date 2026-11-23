import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Send, MessageSquare, Activity } from 'lucide-react'
import { addComment, deleteComment } from '../../api/tasks'
import { useTaskComments, useTaskActivity, useTaskParticipants } from '../../hooks/queries'
import { useUser } from '../../hooks/useAuth'
import Avatar from '../ui/Avatar'
import { ADMIN_ROLES, STATUS_LABELS, PRIORITY_LABELS } from '../../utils/constants'
import { fmtDateTime } from '../../utils/format'

const ACTIVITY_LABELS = {
  status_changed:   (a) => `moved to ${STATUS_LABELS[a.newValue] || a.newValue}`,
  priority_changed: (a) => `changed priority to ${PRIORITY_LABELS[a.newValue] || a.newValue}`,
  reassigned:       ()  => 'reassigned the task',
  commented:        ()  => 'left a comment',
  attached:         (a) => `attached ${a.newValue || 'a file'}`,
  created:          ()  => 'created the task',
}

const escapeRegex = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Comment text with the @mentioned names highlighted
function CommentBody({ comment }) {
  const names = (comment.mentions || []).map((m) => m.name).filter(Boolean)
  if (!names.length) return comment.body
  const pattern = new RegExp(`(@(?:${names.map(escapeRegex).join('|')}))`, 'g')
  return comment.body.split(pattern).map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="text-blue-600 font-medium bg-blue-50 rounded px-0.5">{part}</span>
      : part
  )
}

// Text typed after "@" up to the caret, or null when the caret is not inside a mention
const mentionQuery = (text, caret) => {
  const m = text.slice(0, caret).match(/(?:^|\s)@([^\s@]{0,30})$/)
  return m ? m[1] : null
}

// Comments + activity tabs for a task
export default function TaskDiscussion({ taskId }) {
  const user    = useUser()
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const queryClient = useQueryClient()

  const [tab, setTab]                 = useState('comments')
  const [commentText, setCommentText] = useState('')
  const [mentioned, setMentioned]     = useState([])    // people picked from the @ menu
  const [query, setQuery]             = useState(null)  // text after "@" (menu open) or null
  const [active, setActive]           = useState(0)
  const textarea = useRef(null)

  const { data: comments = [] } = useTaskComments(taskId)
  const { data: activity = [] } = useTaskActivity(taskId)
  const { data: participants = [] } = useTaskParticipants(taskId)
  const others  = participants.filter((p) => p.id !== user?.id)
  const matches = query === null ? [] : others
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6)

  const postComment = useMutation({
    mutationFn: ({ body, mentions }) => addComment(taskId, body, mentions),
    onSuccess:  () => {
      setCommentText('')
      setMentioned([])
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
    const body = commentText.trim()
    if (!body || commentSaving) return
    // Only people whose @Name is still in the text
    const mentions = mentioned.filter((p) => body.includes(`@${p.name}`)).map((p) => p.id)
    postComment.mutate({ body, mentions })
  }

  const handleTyping = (e) => {
    setCommentText(e.target.value)
    setQuery(mentionQuery(e.target.value, e.target.selectionStart))
    setActive(0)
  }

  const pickMention = (person) => {
    const el = textarea.current
    const caret = el.selectionStart
    const before = commentText.slice(0, caret).replace(/@([^\s@]{0,30})$/, `@${person.name} `)
    setCommentText(before + commentText.slice(caret))
    setMentioned((list) => (list.some((p) => p.id === person.id) ? list : [...list, person]))
    setQuery(null)
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(before.length, before.length) })
  }

  const handleKeyDown = (e) => {
    if (matches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % matches.length); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => (i - 1 + matches.length) % matches.length); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pickMention(matches[active]); return }
      if (e.key === 'Escape')    { e.preventDefault(); setQuery(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(e) }
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
              <Avatar name={c.user.name} src={c.user.avatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900">{c.user.name}</span>
                  <span className="text-xs text-gray-400">{fmtDateTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words"><CommentBody comment={c} /></p>
              </div>
              {(isAdmin || c.user.id === user?.id) && (
                <button onClick={() => handleDeleteComment(c.id)} aria-label="Delete comment"
                  className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <form onSubmit={handleComment} className="flex gap-3 pt-2 border-t border-gray-100">
            <span className="hidden sm:block"><Avatar name={user?.name} src={user?.avatarUrl} size="sm" /></span>
            <div className="flex-1 flex gap-2 relative min-w-0">
              <textarea ref={textarea} value={commentText} onChange={handleTyping} onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setQuery(null), 150)} maxLength={5000}
                className="input-field flex-1 resize-none" rows={2}
                placeholder={others.length ? 'Write a comment… type @ to mention someone' : 'Write a comment… (Enter to send)'}
                aria-label="Write a comment" aria-autocomplete="list" aria-expanded={matches.length > 0} />
              {matches.length > 0 && (
                <ul role="listbox" className="absolute bottom-full left-0 mb-1 w-64 max-w-full bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20">
                  {matches.map((p, i) => (
                    <li key={p.id} role="option" aria-selected={i === active}>
                      <button type="button" onMouseDown={(e) => { e.preventDefault(); pickMention(p) }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left ${i === active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                        <Avatar name={p.name} src={p.avatarUrl} size="sm" /> {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="submit" disabled={commentSaving || !commentText.trim()} className="btn-primary px-3 self-end" aria-label="Send comment">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          {postComment.isError && (
            <p className="text-xs text-red-500">{postComment.error.response?.data?.message || 'Could not post the comment.'}</p>
          )}
        </div>
      )}

      {tab === 'activity' && (
        <div className="p-4">
          {activity.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No activity yet.</p>}
          <div className="space-y-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 break-words">
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
