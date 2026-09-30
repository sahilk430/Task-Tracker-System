const express = require('express')
const { body, validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { requireRoles, ADMIN_ROLES } = require('../middleware/roleCheck')

const router = express.Router()
const prisma  = new PrismaClient()

const taskSelect = {
  id: true, title: true, description: true, category: true,
  status: true, priority: true, dueDate: true, startDate: true,
  estimatedHours: true, actualHours: true,
  targetUrl: true, targetKeywords: true, searchIntent: true,
  currentRanking: true, targetRanking: true,
  expectedResult: true, actualResult: true,
  gscImpressionsBefore: true, gscImpressionsAfter: true,
  gscClicksBefore: true, gscClicksAfter: true,
  backlinksCount: true, toolsUsed: true, tags: true,
  createdAt: true, updatedAt: true,
  website:  { select: { id: true, name: true, domain: true } },
  project:  { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, email: true, role: true } },
  creator:  { select: { id: true, name: true } },
  _count:   { select: { comments: true } },
}

// GET /api/tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { websiteId, projectId, status, priority, category, assignedTo, search } = req.query
    const isAdmin = ADMIN_ROLES.includes(req.user.role)

    const where = {}
    if (websiteId)  where.websiteId  = websiteId
    if (projectId)  where.projectId  = projectId
    if (status)     where.status     = status
    if (priority)   where.priority   = priority
    if (category)   where.category   = category
    if (search)     where.title      = { contains: search }

    // Non-admins only see tasks assigned to them
    if (!isAdmin) where.assignedTo = req.user.id
    else if (assignedTo) where.assignedTo = assignedTo

    const tasks = await prisma.task.findMany({
      where,
      select: taskSelect,
      orderBy: [{ createdAt: 'desc' }],
    })
    res.json({ tasks })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// GET /api/tasks/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, select: taskSelect })
    if (!task) return res.status(404).json({ message: 'Task not found.' })
    const isAdmin = ADMIN_ROLES.includes(req.user.role)
    if (!isAdmin && task.assignee.id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    res.json({ task })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// POST /api/tasks
router.post('/', authenticate, requireRoles(...ADMIN_ROLES, 'marketing_manager'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('websiteId').notEmpty().withMessage('websiteId is required'),
    body('category').notEmpty().withMessage('category is required'),
    body('assignedTo').notEmpty().withMessage('assignedTo is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
    const {
      title, description, websiteId, projectId, category, status, priority,
      assignedTo, dueDate, startDate, estimatedHours,
      targetUrl, targetKeywords, searchIntent, currentRanking, targetRanking,
      expectedResult, toolsUsed, tags,
    } = req.body
    try {
      const task = await prisma.task.create({
        data: {
          title, description, websiteId,
          projectId: projectId || null,
          category,
          status:    status   || 'backlog',
          priority:  priority || 'medium',
          assignedTo,
          createdBy: req.user.id,
          dueDate:   dueDate   ? new Date(dueDate)   : null,
          startDate: startDate ? new Date(startDate) : null,
          estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
          targetUrl, targetKeywords, searchIntent,
          currentRanking: currentRanking ? parseInt(currentRanking) : null,
          targetRanking:  targetRanking  ? parseInt(targetRanking)  : null,
          expectedResult, toolsUsed, tags,
        },
        select: taskSelect,
      })
      res.status(201).json({ task, message: 'Task created successfully.' })
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
  }
)

// PUT /api/tasks/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Task not found.' })

    const isAdmin   = ADMIN_ROLES.includes(req.user.role)
    const isManager = req.user.role === 'marketing_manager'
    const isAssignee = existing.assignedTo === req.user.id

    if (!isAdmin && !isManager && !isAssignee) {
      return res.status(403).json({ message: 'Access denied.' })
    }

    const {
      title, description, category, status, priority, assignedTo,
      dueDate, startDate, estimatedHours, actualHours, projectId,
      targetUrl, targetKeywords, searchIntent, currentRanking, targetRanking,
      expectedResult, actualResult, gscImpressionsBefore, gscImpressionsAfter,
      gscClicksBefore, gscClicksAfter, backlinksCount, toolsUsed, tags,
    } = req.body

    const data = {}
    if (title !== undefined)       data.title       = title
    if (description !== undefined) data.description = description
    if (category !== undefined)    data.category    = category
    if (status !== undefined)      data.status      = status
    if (projectId !== undefined)   data.projectId   = projectId || null
    if (dueDate !== undefined)     data.dueDate     = dueDate   ? new Date(dueDate)   : null
    if (startDate !== undefined)   data.startDate   = startDate ? new Date(startDate) : null
    if (estimatedHours !== undefined) data.estimatedHours = estimatedHours ? parseFloat(estimatedHours) : null
    if (actualHours !== undefined)    data.actualHours    = actualHours    ? parseFloat(actualHours)    : null
    // Admin/manager only fields
    if ((isAdmin || isManager) && priority !== undefined)   data.priority   = priority
    if ((isAdmin || isManager) && assignedTo !== undefined) data.assignedTo = assignedTo
    // SEO fields
    if (targetUrl !== undefined)            data.targetUrl            = targetUrl
    if (targetKeywords !== undefined)       data.targetKeywords       = targetKeywords
    if (searchIntent !== undefined)         data.searchIntent         = searchIntent
    if (currentRanking !== undefined)       data.currentRanking       = currentRanking       ? parseInt(currentRanking)       : null
    if (targetRanking !== undefined)        data.targetRanking        = targetRanking        ? parseInt(targetRanking)        : null
    if (expectedResult !== undefined)       data.expectedResult       = expectedResult
    if (actualResult !== undefined)         data.actualResult         = actualResult
    if (gscImpressionsBefore !== undefined) data.gscImpressionsBefore = gscImpressionsBefore ? parseInt(gscImpressionsBefore) : null
    if (gscImpressionsAfter !== undefined)  data.gscImpressionsAfter  = gscImpressionsAfter  ? parseInt(gscImpressionsAfter)  : null
    if (gscClicksBefore !== undefined)      data.gscClicksBefore      = gscClicksBefore      ? parseInt(gscClicksBefore)      : null
    if (gscClicksAfter !== undefined)       data.gscClicksAfter       = gscClicksAfter       ? parseInt(gscClicksAfter)       : null
    if (backlinksCount !== undefined)       data.backlinksCount       = backlinksCount       ? parseInt(backlinksCount)       : null
    if (toolsUsed !== undefined)            data.toolsUsed            = toolsUsed
    if (tags !== undefined)                 data.tags                 = tags

    const task = await prisma.task.update({ where: { id: req.params.id }, data, select: taskSelect })

    // Log status / priority changes
    const logItems = []
    if (status !== undefined && status !== existing.status)
      logItems.push({ fieldName: 'status', oldValue: existing.status, newValue: status, action: 'status_changed' })
    if (priority !== undefined && priority !== existing.priority && (isAdmin || isManager))
      logItems.push({ fieldName: 'priority', oldValue: existing.priority, newValue: priority, action: 'priority_changed' })
    if (assignedTo !== undefined && assignedTo !== existing.assignedTo && (isAdmin || isManager))
      logItems.push({ fieldName: 'assignedTo', oldValue: existing.assignedTo, newValue: assignedTo, action: 'reassigned' })
    for (const item of logItems) {
      await prisma.taskActivity.create({
        data: { taskId: req.params.id, userId: req.user.id, ...item },
      }).catch(() => {})
    }

    res.json({ task, message: 'Task updated successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// DELETE /api/tasks/:id
router.delete('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Task not found.' })
    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ message: 'Task deleted successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// GET /api/tasks/:id/comments
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const comments = await prisma.taskComment.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ comments })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// POST /api/tasks/:id/comments
router.post('/:id/comments', authenticate,
  [body('body').trim().notEmpty().withMessage('Comment cannot be empty.')],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
    try {
      const task = await prisma.task.findUnique({ where: { id: req.params.id } })
      if (!task) return res.status(404).json({ message: 'Task not found.' })
      const comment = await prisma.taskComment.create({
        data: { taskId: req.params.id, userId: req.user.id, body: req.body.body },
        include: { user: { select: { id: true, name: true, role: true } } },
      })
      // Log activity
      await prisma.taskActivity.create({
        data: { taskId: req.params.id, userId: req.user.id, action: 'commented' },
      }).catch(() => {})
      res.status(201).json({ comment })
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
  }
)

// DELETE /api/tasks/:id/comments/:commentId
router.delete('/:id/comments/:commentId', authenticate, async (req, res) => {
  try {
    const comment = await prisma.taskComment.findUnique({ where: { id: req.params.commentId } })
    if (!comment) return res.status(404).json({ message: 'Comment not found.' })
    const isAdmin = ADMIN_ROLES.includes(req.user.role)
    if (!isAdmin && comment.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    await prisma.taskComment.delete({ where: { id: req.params.commentId } })
    res.json({ message: 'Comment deleted.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// GET /api/tasks/:id/activity
router.get('/:id/activity', authenticate, async (req, res) => {
  try {
    const activity = await prisma.taskActivity.findMany({
      where: { taskId: req.params.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ activity })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

module.exports = router
