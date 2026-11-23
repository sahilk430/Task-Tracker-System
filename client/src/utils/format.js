export const fmtDate     = (d) => d ? new Date(d).toLocaleDateString() : '—'
export const fmtDateLong = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
export const fmtDateTime = (d) => new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

// "just now", "5m ago", "3h ago", "2d ago", then the date
export const timeAgo = (d) => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000)
  if (s < 60)      return 'just now'
  if (s < 3600)    return `${Math.floor(s / 60)}m ago`
  if (s < 86400)   return `${Math.floor(s / 3600)}h ago`
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`
  return fmtDate(d)
}

export const fmtBytes = (n) => {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}
