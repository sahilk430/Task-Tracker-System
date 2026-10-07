const express = require('express')
const { body } = require('express-validator')
const { Task, TaskComment, TaskActivity } = require('../models')
const { authenticate } = require('../middleware/auth')
const { requireRoles, isAdmin, canManageAll } = require('../middleware/roleCheck')
const { validate } = require('../middleware/validate')
const { ADMIN_ROLES, MANAGEMENT_ROLES } = require('../config/constants')
const { HttpError, orNotFound } = require('../utils/httpError')
const { containsRegex } = require('../utils/parse')
const { withCounts } = require('../utils/countBy')

const router = express.Router()

const POPULATE = [
  { path: 'website',  select: 'name domain' },
  { path: 'project',  select: 'name' },
  { path: 'assignee', select: 'name email role' },
  { path: 'creator',  select: 'name' },
]
const COUNTS = { comments: [TaskComment, 'task'] }
const COMMENT_AUTHOR = ['user', 'name role']

// Populated JSON with `_count`, as returned by every task endpoint
const present = async (task) => (await withCounts([await task.populate(POPULATE)], COUNTS))[0]

const logActivity = (taskId, userId, entry) =>
  TaskActivity.create({ task: taskId, user: userId, ...entry })

// GET /api/tasks
router.get('/', authenticate, async (req, res) => {
  const filter = Task.filterFromQuery(req.query)
  if (req.query.search) filter.title = containsRegex(req.query.search)
  // Non-admins only see tasks assigned to them
  if (!isAdmin(req.user)) filter.assignee = req.user.id

  const tasks = await Task.find(filter).populate(POPULATE).sort({ createdAt: -1 })
  res.json({ tasks: await withCounts(tasks, COUNTS) })
})

// GET /api/tasks/:id
router.get('/:id', authenticate, async (req, res) => {
  const task = await present(orNotFound(await Task.findById(req.params.id), 'Task'))
  if (!isAdmin(req.user) && task.assignee?.id !== req.user.id) {
    throw new HttpError(403, 'Access denied.')
  }
  res.json({ task })
})

// POST /api/tasks
router.post('/', authenticate, requireRoles(...MANAGEMENT_ROLES),
  validate([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('websiteId').notEmpty().withMessage('websiteId is required'),
    body('category').notEmpty().withMessage('category is required'),
    body('assignedTo').notEmpty().withMessage('assignedTo is required'),
  ]),
  async (req, res) => {
    const task = await Task.create({
      ...Task.fieldsFromBody(req.body, { canManage: true }),
      creator: req.user.id,
    })
    res.status(201).json({ task: await present(task), message: 'Task created successfully.' })
  }
)

// PUT /api/tasks/:id
router.put('/:id', authenticate, async (req, res) => {
  const task = orNotFound(await Task.findById(req.params.id), 'Task')
  const canManage = canManageAll(req.user)
  if (!canManage && task.assignee.toString() !== req.user.id) {
    throw new HttpError(403, 'Access denied.')
  }

  // Remember tracked values so changes can be written to the audit log
  const tracked = [
    { fieldName: 'status',     path: 'status',   action: 'status_changed' },
    { fieldName: 'priority',   path: 'priority', action: 'priority_changed' },
    { fieldName: 'assignedTo', path: 'assignee', action: 'reassigned' },
  ].map((t) => ({ ...t, oldValue: String(task.get(t.path)) }))

  task.set(Task.fieldsFromBody(req.body, { canManage }))
  await task.save()

  await Promise.all(tracked
    .filter((t) => String(task.get(t.path)) !== t.oldValue)
    .map(({ fieldName, path, action, oldValue }) =>
      logActivity(task._id, req.user.id, { action, fieldName, oldValue, newValue: String(task.get(path)) })
    ))

  res.json({ task: await present(task), message: 'Task updated successfully.' })
})

// DELETE /api/tasks/:id — also removes its comments and activity
router.delete('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const task = orNotFound(await Task.findById(req.params.id), 'Task')
  await Promise.all([
    TaskComment.deleteMany({ task: task._id }),
    TaskActivity.deleteMany({ task: task._id }),
  ])
  await task.deleteOne()
  res.json({ message: 'Task deleted successfully.' })
})

// GET /api/tasks/:id/comments
router.get('/:id/comments', authenticate, async (req, res) => {
  const comments = await TaskComment.find({ task: req.params.id })
    .populate(...COMMENT_AUTHOR)
    .sort({ createdAt: 1 })
  res.json({ comments })
})

// POST /api/tasks/:id/comments
router.post('/:id/comments', authenticate,
  validate([body('body').trim().notEmpty().withMessage('Comment cannot be empty.')]),
  async (req, res) => {
    orNotFound(await Task.exists({ _id: req.params.id }), 'Task')
    const comment = await TaskComment.create({ task: req.params.id, user: req.user.id, body: req.body.body })
    await Promise.all([
      comment.populate(...COMMENT_AUTHOR),
      logActivity(req.params.id, req.user.id, { action: 'commented' }),
    ])
    res.status(201).json({ comment })
  }
)

// DELETE /api/tasks/:id/comments/:commentId
router.delete('/:id/comments/:commentId', authenticate, async (req, res) => {
  const comment = orNotFound(await TaskComment.findById(req.params.commentId), 'Comment')
  if (!isAdmin(req.user) && comment.user.toString() !== req.user.id) {
    throw new HttpError(403, 'Access denied.')
  }
  await comment.deleteOne()
  res.json({ message: 'Comment deleted.' })
})

// GET /api/tasks/:id/activity
router.get('/:id/activity', authenticate, async (req, res) => {
  const activity = await TaskActivity.find({ task: req.params.id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
  res.json({ activity })
})

module.exports = router
