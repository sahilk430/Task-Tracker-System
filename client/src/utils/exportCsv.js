import { STATUS_LABELS, PRIORITY_LABELS, categoryLabel } from './constants'

export function exportTasksCSV(tasks) {
  const headers = [
    'Title','Status','Priority','Category','Website','Project',
    'Assigned To','Due Date','Created At','Est. Hours','Actual Hours',
    'Target URL','Target Keywords','Search Intent',
    'Current Rank','Target Rank','Tools Used','Tags',
    'Expected Result','Actual Result',
  ]
  const esc = (v) => (v == null ? '' : String(v).replace(/"/g, '""'))
  const rows = tasks.map((t) => [
    esc(t.title),
    esc(STATUS_LABELS[t.status]   || t.status),
    esc(PRIORITY_LABELS[t.priority] || t.priority),
    esc(categoryLabel(t.category)),
    esc(t.website?.name), esc(t.project?.name),
    esc(t.assignee?.name),
    esc(t.dueDate   ? new Date(t.dueDate).toLocaleDateString()   : ''),
    esc(t.createdAt ? new Date(t.createdAt).toLocaleDateString() : ''),
    esc(t.estimatedHours), esc(t.actualHours),
    esc(t.targetUrl), esc(t.targetKeywords), esc(t.searchIntent),
    esc(t.currentRanking), esc(t.targetRanking),
    esc(t.toolsUsed), esc(t.tags),
    esc(t.expectedResult), esc(t.actualResult),
  ])
  const csv  = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `tasks-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
