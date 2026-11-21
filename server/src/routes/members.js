const express = require('express')
const { Task, User } = require('../models')
const { authenticate } = require('../middleware/auth')
const { canManageAll } = require('../middleware/roleCheck')
const { CLOSED_TASK_STATUSES, TASK_STATUSES, TASK_PRIORITIES } = require('../config/constants')
const { HttpError, orNotFound } = require('../utils/httpError')
const { taskSummaryByAssignee, summaryFor, recentActivity } = require('../utils/taskStats')

const router = express.Router()

// Team members are the existing User records — this router only reads them.
const MEMBER_FIELDS = 'name email role avatarUrl isActive createdAt'
const TASK_POPULATE = [
  { path: 'website', select: 'name domain' },
  { path: 'project', select: 'name' },
]
const UPCOMING_DAYS = 14
const LIST_LIMIT    = 10

// Managers see every member; everyone else only themselves
const canViewMember = (user, memberId) => canManageAll(user) || user.id === memberId

// GET /api/members — every member with their task summary
router.get('/', authenticate, async (req, res) => {
  const filter = canManageAll(req.user) ? {} : { _id: req.user.id }
  const users  = await User.find(filter).select(MEMBER_FIELDS).sort({ name: 1 })
  const stats  = await taskSummaryByAssignee(users.map((u) => u._id))

  res.json({ members: users.map((u) => ({ ...u.toJSON(), stats: summaryFor(stats, u.id) })) })
})

// GET /api/members/:id — member dashboard data
router.get('/:id', authenticate, async (req, res) => {
  if (!canViewMember(req.user, req.params.id)) throw new HttpError(403, 'Access denied.')
  const member = orNotFound(await User.findById(req.params.id).select(MEMBER_FIELDS), 'Member')

  const now      = new Date()
  const horizon  = new Date(now.getTime() + UPCOMING_DAYS * 24 * 60 * 60 * 1000)
  const mine     = { assignee: member._id }
  const open     = { $nin: CLOSED_TASK_STATUSES }

  const [stats, breakdown, upcoming, overdue, completed, taskIds] = await Promise.all([
    taskSummaryByAssignee([member._id], now),
    Task.aggregate([
      { $match: mine },
      { $facet: {
        status:   [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        priority: [{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: '$priority', count: { $sum: 1 } } }],
      } },
    ]),
    Task.find({ ...mine, status: open, dueDate: { $gte: now, $lte: horizon } })
      .populate(TASK_POPULATE).sort({ dueDate: 1 }).limit(LIST_LIMIT),
    Task.find({ ...mine, ...Task.overdueFilter(now) })
      .populate(TASK_POPULATE).sort({ dueDate: 1 }).limit(LIST_LIMIT),
    Task.find({ ...mine, status: 'done' })
      .populate(TASK_POPULATE).sort({ completedAt: -1, updatedAt: -1 }).limit(LIST_LIMIT),
    Task.find(mine).distinct('_id'),
  ])

  // Zero-filled maps in the canonical order
  const toMap = (rows, keys) => Object.fromEntries(keys.map((k) => [k, rows.find((r) => r._id === k)?.count || 0]))

  res.json({
    member,
    stats:      summaryFor(stats, member.id),
    byStatus:   toMap(breakdown[0].status, TASK_STATUSES),
    byPriority: toMap(breakdown[0].priority, TASK_PRIORITIES),
    upcoming,
    overdue,
    completed,
    recentActivity: await recentActivity({ task: { $in: taskIds } }, 15),
  })
})

module.exports = router
