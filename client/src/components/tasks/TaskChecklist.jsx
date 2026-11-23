import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import { addChecklistItem, updateChecklistItem, deleteChecklistItem } from '../../api/tasks'
import ProgressBar from '../ui/ProgressBar'

// Sub-steps of a task. Anyone who can open the task can add, tick and remove steps.
export default function TaskChecklist({ task }) {
  const queryClient = useQueryClient()
  const [text, setText]   = useState('')
  const [error, setError] = useState('')
  const items = task.checklist || []
  const done  = items.filter((i) => i.done).length

  // Every endpoint answers with the full checklist — write it straight into the cached task
  const apply = ({ data }) => {
    setError('')
    queryClient.setQueryData(['tasks', 'detail', task.id], (t) => (t ? { ...t, checklist: data.checklist } : t))
    queryClient.invalidateQueries({ queryKey: ['tasks', 'list'] })
  }
  const onError = (err) => setError(err.response?.data?.message || 'Could not save the change.')

  const add    = useMutation({ mutationFn: (value) => addChecklistItem(task.id, value), onSuccess: (r) => { setText(''); apply(r) }, onError })
  const toggle = useMutation({ mutationFn: (item) => updateChecklistItem(task.id, item.id, { done: !item.done }), onSuccess: apply, onError })
  const remove = useMutation({ mutationFn: (item) => deleteChecklistItem(task.id, item.id), onSuccess: apply, onError })

  const handleAdd = (e) => {
    e.preventDefault()
    if (text.trim() && !add.isPending) add.mutate(text.trim())
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-gray-400" /> Checklist
        </h3>
        {items.length > 0 && <span className="text-xs text-gray-500">{done} of {items.length} done</span>}
      </div>
      {items.length > 0 && <ProgressBar value={Math.round((done / items.length) * 100)} className="mb-3" />}

      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-gray-50">
            <input type="checkbox" checked={item.done} onChange={() => toggle.mutate(item)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer" aria-label={item.text} />
            <span className={`flex-1 text-sm break-words ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item.text}</span>
            <button onClick={() => remove.mutate(item)} aria-label={`Remove step: ${item.text}`}
              className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2 mt-3">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200}
          className="input-field" placeholder={items.length ? 'Add another step…' : 'Break this task into steps…'} aria-label="New checklist step" />
        <button type="submit" disabled={!text.trim() || add.isPending} className="btn-secondary px-3 flex items-center gap-1">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add</span>
        </button>
      </form>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}
