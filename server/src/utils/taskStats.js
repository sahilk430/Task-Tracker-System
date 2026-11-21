const { Task, TaskActivity, User } = require('../models')
const { STATUS_GROUPS, CLOSED_TASK_STATUSES } = require('../config/constants')

// 1 when `cond` holds, else 0 — for $sum inside $group
const countIf = (cond) => ({ $sum: { $cond: [cond, 1, 0] } })
const statusIn = (statuses) => ({ $in: ['$status', statuses] })

// $group accumulators for the summary counts. `total` excludes cancelled tasks,
// overdue = due date passed and not done / cancelled (derived, never stored).
const summaryAccumulators = (now) => ({
  total:      countIf({ $ne: ['$status', 'cancelled'] }),
  completed:  countIf(statusIn(STATUS_GROUPS.completed)),
  pending:    countIf(statusIn(STATUS_GROUPS.pending)),
  inProgress: countIf(statusIn(STATUS_GROUPS.inProgress)),
  cancelled:  countIf({ $eq: ['$status', 'cancelled'] }),
  overdue:    countIf({ $and: [
    { $eq: [{ $type: '$dueDate' }, 'date'] },
    { $lt: ['$dueDate', now] },
    { $not: [statusIn(CLOSED_TASK_STATUSES)] },
  ] }),
})

const EMPTY_SUMMARY = { total: 0, completed: 0, pending: 0, inProgress: 0, cancelled: 0, overdue: 0 }

// Completed ÷ total assigned (cancelled excluded), as a whole percentage. 0 when no tasks.
const completionRate = ({ total, completed }) => (total > 0 ? Math.round((completed / total) * 100) : 0)

const withRate = (summary) => ({ ...summary, completionRate: completionRate(summary) })

// Summary counts for every task matching `match`
async function taskSummary(match = {}, now = new Date()) {
  const [group] = await Task.aggregate([
    { $match: match },
    { $group: { _id: null, ...summaryAccumulators(now) } },
  ])
  if (!group) return withRate({ ...EMPTY_SUMMARY })
  const { _id, ...summary } = group
  return withRate(summary)
}

// Summary counts per assignee: { [userId]: summary }
async function taskSummaryByAssignee(userIds, now = new Date()) {
  const groups = await Task.aggregate([
    { $match: { assignee: { $in: userIds } } },
    { $group: { _id: '$assignee', ...summaryAccumulators(now) } },
  ])
  return Object.fromEntries(groups.map(({ _id, ...summary }) => [_id.toString(), withRate(summary)]))
}

const summaryFor = (map, id) => map[id] || withRate({ ...EMPTY_SUMMARY })

// Recent activity, newest first, with task titles and user names resolved.
// `created` / `reassigned` entries store user ids — `newValueName` / `oldValueName` carry the names.
async function recentActivity(filter, limit = 15) {
  const entries = await TaskActivity.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name')
    .populate('task', 'title')

  const userIds = new Set()
  for (const a of entries) {
    if (a.fieldName === 'assignedTo') [a.oldValue, a.newValue].forEach((v) => v && userIds.add(v))
  }
  const ids   = [...userIds].filter((v) => /^[a-f\d]{24}$/i.test(v))
  const names = new Map((await User.find({ _id: { $in: ids } }).select('name')).map((u) => [u.id, u.name]))

  return entries.map((a) => {
    const json = a.toJSON()
    if (a.fieldName === 'assignedTo') {
      json.oldValueName = names.get(a.oldValue) || null
      json.newValueName = names.get(a.newValue) || null
    }
    return json
  })
}

module.exports = {
  countIf, taskSummary, taskSummaryByAssignee, summaryFor, completionRate, recentActivity,
}
