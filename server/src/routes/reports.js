const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { requireRoles, ADMIN_ROLES } = require('../middleware/roleCheck')

const router = express.Router()
const prisma  = new PrismaClient()

const reportTaskSelect = {
  id: true, title: true, category: true, status: true, priority: true,
  dueDate: true, startDate: true, createdAt: true, updatedAt: true,
  estimatedHours: true, actualHours: true,
  targetUrl: true, targetKeywords: true, searchIntent: true,
  currentRanking: true, targetRanking: true,
  expectedResult: true, actualResult: true,
  gscImpressionsBefore: true, gscImpressionsAfter: true,
  gscClicksBefore: true, gscClicksAfter: true,
  backlinksCount: true, toolsUsed: true, tags: true,
  website:  { select: { id: true, name: true, domain: true } },
  project:  { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, role: true } },
  creator:  { select: { id: true, name: true } },
}

// GET /api/reports/tasks
router.get('/tasks', authenticate, requireRoles(...ADMIN_ROLES, 'marketing_manager'), async (req, res) => {
  try {
    const { websiteId, projectId, status, priority, category, assignedTo, dateFrom, dateTo, dateField = 'createdAt' } = req.query

    const where = {}
    if (websiteId)  where.websiteId  = websiteId
    if (projectId)  where.projectId  = projectId
    if (status)     where.status     = status
    if (priority)   where.priority   = priority
    if (category)   where.category   = category
    if (assignedTo) where.assignedTo = assignedTo

    if (dateFrom || dateTo) {
      const field = ['createdAt', 'dueDate', 'updatedAt'].includes(dateField) ? dateField : 'createdAt'
      where[field] = {}
      if (dateFrom) where[field].gte = new Date(dateFrom)
      if (dateTo)   where[field].lte = new Date(dateTo + 'T23:59:59Z')
    }

    const tasks = await prisma.task.findMany({ where, select: reportTaskSelect, orderBy: { createdAt: 'desc' } })

    const now = new Date()
    const summary = {
      total:               tasks.length,
      done:                tasks.filter((t) => t.status === 'done').length,
      inProgress:          tasks.filter((t) => t.status === 'in_progress').length,
      inReview:            tasks.filter((t) => t.status === 'in_review').length,
      overdue:             tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && !['done','cancelled'].includes(t.status)).length,
      totalEstimatedHours: tasks.reduce((s, t) => s + (t.estimatedHours || 0), 0),
      totalActualHours:    tasks.reduce((s, t) => s + (t.actualHours    || 0), 0),
    }

    res.json({ tasks, summary })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// GET /api/reports/websites
router.get('/websites', authenticate, requireRoles(...ADMIN_ROLES, 'marketing_manager'), async (req, res) => {
  try {
    const websites = await prisma.website.findMany({
      where: { status: { not: 'archived' } },
      select: {
        id: true, name: true, domain: true, status: true,
        _count: { select: { tasks: true, projects: true } },
        tasks: { select: { status: true, dueDate: true } },
      },
      orderBy: { name: 'asc' },
    })

    const now = new Date()
    const result = websites.map((w) => ({
      id: w.id, name: w.name, domain: w.domain, status: w.status,
      totalTasks:    w._count.tasks,
      totalProjects: w._count.projects,
      done:       w.tasks.filter((t) => t.status === 'done').length,
      inProgress: w.tasks.filter((t) => t.status === 'in_progress').length,
      overdue:    w.tasks.filter((t) => t.dueDate && new Date(t.dueDate) < now && !['done','cancelled'].includes(t.status)).length,
    }))

    res.json({ websites: result })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

module.exports = router
