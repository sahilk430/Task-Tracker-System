const { Task, User } = require('../models')

const DAY  = 24 * 60 * 60 * 1000
const WEEK = 7 * DAY
const MAX_WEEKS = 26

// When a done task was finished. Tasks completed before `completedAt` existed fall back to updatedAt.
const finishedAt = (t) => t.completedAt || t.updatedAt

// On time = finished no later than the end of its due day. Tasks without a due date don't count.
const onTime = (t) => finishedAt(t).getTime() < new Date(t.dueDate).getTime() + DAY

// Days from start (startDate, else createdAt) to completion
const cycleDays = (t) => Math.max(0, (finishedAt(t) - (t.startDate || t.createdAt)) / DAY)

const round1 = (n) => Math.round(n * 10) / 10
const pct    = (part, total) => (total ? Math.round((part / total) * 100) : null)

function summarise(tasks, weeks, now) {
  const weekly = Array(weeks).fill(0)
  let withDue = 0, onTimeCount = 0, days = 0
  for (const t of tasks) {
    // Index 0 = oldest window, weeks - 1 = the last 7 days
    const ago = Math.floor((now - finishedAt(t)) / WEEK)
    if (ago >= 0 && ago < weeks) weekly[weeks - 1 - ago]++
    if (t.dueDate) { withDue++; if (onTime(t)) onTimeCount++ }
    days += cycleDays(t)
  }
  return {
    weekly,
    completed:   tasks.length,
    onTimeRate:  pct(onTimeCount, withDue),   // null when no completed task had a due date
    onTimeCount,
    withDueDate: withDue,
    avgDays:     tasks.length ? round1(days / tasks.length) : null,
  }
}

// Completed-work trends over the last `weeks` rolling 7-day windows.
//   memberIds: limit to these users (default: every user)
// → { weeks: [{ start, end }], team: summary, members: [{ id, name, role, avatarUrl, isActive, ...summary }] }
async function completionTrends({ weeks = 8, memberIds = null, now = new Date() } = {}) {
  weeks = Math.min(MAX_WEEKS, Math.max(1, Number(weeks) || 8))
  const since = new Date(now.getTime() - weeks * WEEK)

  const userFilter = memberIds ? { _id: { $in: memberIds } } : {}
  const users = await User.find(userFilter).select('name role avatarUrl isActive').sort({ name: 1 })

  const tasks = await Task.find({
    status: 'done',
    assignee: { $in: users.map((u) => u._id) },
    $or: [
      { completedAt: { $gte: since } },
      { completedAt: null, updatedAt: { $gte: since } },
    ],
  }).select('assignee completedAt updatedAt dueDate startDate createdAt').lean()

  const byUser = new Map(users.map((u) => [u.id, []]))
  for (const t of tasks) byUser.get(String(t.assignee))?.push(t)

  const windows = Array.from({ length: weeks }, (_, i) => {
    const end = new Date(now.getTime() - (weeks - 1 - i) * WEEK)
    return { start: new Date(end.getTime() - WEEK), end }
  })

  return {
    weeks:   windows,
    team:    summarise(tasks, weeks, now),
    members: users.map((u) => ({
      id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl, isActive: u.isActive,
      ...summarise(byUser.get(u.id), weeks, now),
    })),
  }
}

module.exports = { completionTrends, MAX_WEEKS }
