import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Paperclip, Upload, Download, Trash2, FileText, FileImage, FileSpreadsheet, FileArchive, File as FileIcon } from 'lucide-react'
import { uploadAttachment, downloadAttachment, deleteAttachment } from '../../api/tasks'
import { useTaskAttachments } from '../../hooks/queries'
import { useUser } from '../../hooks/useAuth'
import { ADMIN_ROLES } from '../../utils/constants'
import { fmtBytes, timeAgo } from '../../utils/format'

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip'

const iconFor = (type) => {
  if (type.startsWith('image/')) return FileImage
  if (type.includes('sheet') || type.includes('excel') || type === 'text/csv') return FileSpreadsheet
  if (type.includes('zip')) return FileArchive
  if (type.includes('pdf') || type.includes('word') || type.startsWith('text/')) return FileText
  return FileIcon
}

// The download needs the auth header, so it is fetched as a blob and saved from an object URL
async function saveFile(taskId, a) {
  const { data } = await downloadAttachment(taskId, a.id)
  const url = URL.createObjectURL(data)
  const link = Object.assign(document.createElement('a'), { href: url, download: a.filename })
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function TaskAttachments({ taskId }) {
  const user    = useUser()
  const isAdmin = ADMIN_ROLES.includes(user?.role)
  const queryClient = useQueryClient()
  const input = useRef(null)
  const [progress, setProgress] = useState(null)
  const [error, setError]       = useState('')
  const [dragging, setDragging] = useState(false)
  const { data: attachments = [], isPending } = useTaskAttachments(taskId)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', taskId] })
    queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
  }
  const onError = (err) => setError(err.response?.data?.message || 'Something went wrong. Please try again.')

  const upload = useMutation({
    mutationFn: (file) => uploadAttachment(taskId, file, (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100))),
    onSuccess:  () => { setError(''); refresh() },
    onError,
    onSettled:  () => setProgress(null),
  })
  const remove = useMutation({ mutationFn: (a) => deleteAttachment(taskId, a.id), onSuccess: refresh, onError })
  const download = useMutation({ mutationFn: (a) => saveFile(taskId, a), onError })

  const pick = (file) => {
    if (!file) return
    if (file.size > MAX_BYTES) return setError('File is too large (max 10 MB).')
    setError('')
    upload.mutate(file)
  }
  const handleDelete = (a) => { if (confirm(`Delete "${a.filename}"?`)) remove.mutate(a) }

  return (
    <div className="card p-5"
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]) }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-gray-400" /> Attachments
          {attachments.length > 0 && <span className="text-xs font-normal text-gray-400">({attachments.length})</span>}
        </h3>
        <button onClick={() => input.current?.click()} disabled={upload.isPending} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> {upload.isPending ? `Uploading ${progress ?? 0}%` : 'Upload'}
        </button>
        <input ref={input} type="file" accept={ACCEPT} className="hidden"
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      {isPending ? (
        <div className="h-10 bg-gray-100 rounded animate-pulse" />
      ) : attachments.length === 0 ? (
        <button onClick={() => input.current?.click()}
          className={`w-full border-2 border-dashed rounded-lg py-6 text-sm transition-colors ${dragging ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
          Drop a file here or click to upload<br />
          <span className="text-xs">Images, PDF, Office, CSV, TXT or ZIP · up to 10 MB</span>
        </button>
      ) : (
        <ul className={`divide-y divide-gray-100 rounded-lg ${dragging ? 'ring-2 ring-blue-400' : ''}`}>
          {attachments.map((a) => {
            const Icon = iconFor(a.contentType)
            const canDelete = isAdmin || a.user?.id === user?.id
            return (
              <li key={a.id} className="flex items-center gap-3 py-2">
                <Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-800 truncate" title={a.filename}>{a.filename}</p>
                  <p className="text-xs text-gray-400">{fmtBytes(a.size)} · {a.user?.name} · {timeAgo(a.createdAt)}</p>
                </div>
                <button onClick={() => download.mutate(a)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600" aria-label={`Download ${a.filename}`}>
                  <Download className="w-4 h-4" />
                </button>
                {canDelete && (
                  <button onClick={() => handleDelete(a)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" aria-label={`Delete ${a.filename}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
