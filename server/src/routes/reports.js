const express = require('express')
const { Task, Website, Project } = require('../models')
const { authenticate } = require('../middleware/auth')
const { requireRoles } = require('../middleware/roleCheck')
const { MANAGEMENT_ROLES, CLOSED_TASK_STATUSES } = require('../config/constants')
const { countBy } = require('../utils/countBy')

const router = express.Router()
const canViewReports = requireRoles(...MANAGEMENT_ROLES)

const DATE_FILTER_FIELDS = ['createdAt', 'dueDate', 'updatedAt']

const POPULATE = [
  { path: 'website',  select: 'name domain' },
  { path: 'project',  select: 'name' },
  { path: 'assignee', select: 'name role' },
  { path: 'creator',  select: 'name' },
]

const isOverdue = (task, now) =>
  task.dueDate && task.dueDate < now && !CLOSED_TASK_STATUSES.includes(task.status)

const countStatus = (tasks, status) => tasks.filter((t) => t.status === status).length
const sum = (tasks, field) => tasks.reduce((total, t) => total + (t[field] || 0), 0)

// Task.filterFromQuery + an optional date range on one of DATE_FILTER_FIELDS
function buildReportFilter(query) {
  const filter = Task.filterFromQuery(query)
  const { dateFrom, dateTo, dateField } = query

  if (dateFrom || dateTo) {
    const field = DATE_FILTER_FIELDS.includes(dateField) ? dateField : 'createdAt'
    filter[field] = {}
    if (dateFrom) filter[field].$gte = new Date(dateFrom)
    if (dateTo)   filter[field].$lte = new Date(`${dateTo}T23:59:59Z`)
  }
  return filter
}

// 1 when `cond` holds, else 0 — for $sum inside $group
const countIf = (cond) => ({ $sum: { $cond: [cond, 1, 0] } })

// Per-website task totals, computed in the database: { [websiteId]: { total, done, inProgress, overdue } }
async function taskStatsByWebsite(ids, now) {
  const groups = await Task.aggregate([
    { $match: { website: { $in: ids } } },
    { $group: {
      _id:        '$website',
      total:      { $sum: 1 },
      done:       countIf({ $eq: ['$status', 'done'] }),
      inProgress: countIf({ $eq: ['$status', 'in_progress'] }),
      overdue:    countIf({ $and: [
        { $eq: [{ $type: '$dueDate' }, 'date'] },
        { $lt: ['$dueDate', now] },
        { $not: [{ $in: ['$status', CLOSED_TASK_STATUSES] }] },
      ] }),
    } },
  ])
  return Object.fromEntries(groups.map(({ _id, ...stats }) => [_id.toString(), stats]))
}

// GET /api/reports/tasks
router.get('/tasks', authenticate, canViewReports, async (req, res) => {
  const tasks = await Task.find(buildReportFilter(req.query))
    .select('-description')
    .populate(POPULATE)
    .sort({ createdAt: -1 })

  const now = new Date()
  const summary = {
    total:               tasks.length,
    done:                countStatus(tasks, 'done'),
    inProgress:          countStatus(tasks, 'in_progress'),
    inReview:            countStatus(tasks, 'in_review'),
    overdue:             tasks.filter((t) => isOverdue(t, now)).length,
    totalEstimatedHours: sum(tasks, 'estimatedHours'),
    totalActualHours:    sum(tasks, 'actualHours'),
  }

  res.json({ tasks, summary })
})

// GET /api/reports/websites
router.get('/websites', authenticate, canViewReports, async (req, res) => {
  const websites = await Website.find({ status: { $ne: 'archived' } }).select('name domain status').sort({ name: 1 })
  const ids = websites.map((w) => w._id)

  const [taskStats, projectCounts] = await Promise.all([
    taskStatsByWebsite(ids, new Date()),
    countBy(Project, 'website', ids),
  ])

  const result = websites.map((w) => {
    const stats = taskStats[w.id] || { total: 0, done: 0, inProgress: 0, overdue: 0 }
    return {
      id: w.id, name: w.name, domain: w.domain, status: w.status,
      totalTasks:    stats.total,
      totalProjects: projectCounts[w.id] || 0,
      done:          stats.done,
      inProgress:    stats.inProgress,
      overdue:       stats.overdue,
    }
  })

  res.json({ websites: result })
})

module.exports = router
