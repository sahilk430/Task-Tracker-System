const express = require('express')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { ADMIN_ROLES } = require('../middleware/roleCheck')

const router = express.Router()
const prisma  = new PrismaClient()

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const isAdmin   = ADMIN_ROLES.includes(req.user.role)
    const isManager = req.user.role === 'marketing_manager'
    const canSeeAll = isAdmin || isManager

    const taskWhere  = canSeeAll ? {} : { assignedTo: req.user.id }
    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      allTasks,
      overdueCount,
      completedThisMonth,
      totalWebsites,
      totalProjects,
      recentActivity,
    ] = await Promise.all([
      prisma.task.findMany({
        where: taskWhere,
        select: { status: true, priority: true, category: true },
      }),
      prisma.task.count({
        where: { ...taskWhere, dueDate: { lt: now }, status: { notIn: ['done', 'cancelled'] } },
      }),
      prisma.task.count({
        where: { ...taskWhere, status: 'done', updatedAt: { gte: monthStart } },
      }),
      canSeeAll ? prisma.website.count({ where: { status: { not: 'archived' } } }) : Promise.resolve(null),
      canSeeAll ? prisma.project.count() : Promise.resolve(null),
      prisma.taskActivity.findMany({
        where: canSeeAll ? {} : { task: { assignedTo: req.user.id } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
        },
      }),
    ])

    // Aggregate
    const tasksByStatus   = {}
    const tasksByPriority = {}
    const tasksByCategory = {}
    for (const t of allTasks) {
      tasksByStatus[t.status]     = (tasksByStatus[t.status]     || 0) + 1
      tasksByPriority[t.priority] = (tasksByPriority[t.priority] || 0) + 1
      tasksByCategory[t.category] = (tasksByCategory[t.category] || 0) + 1
    }

    // Team workload — admin/manager only
    let teamWorkload = null
    if (canSeeAll) {
      const [assignedGroups, doneGroups] = await Promise.all([
        prisma.task.groupBy({ by: ['assignedTo'], _count: { id: true } }),
        prisma.task.groupBy({ by: ['assignedTo'], where: { status: 'done' }, _count: { id: true } }),
      ])
      const doneMap = Object.fromEntries(doneGroups.map((g) => [g.assignedTo, g._count.id]))
      const users   = await prisma.user.findMany({
        where: { id: { in: assignedGroups.map((g) => g.assignedTo) } },
        select: { id: true, name: true, role: true },
      })
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]))
      teamWorkload = assignedGroups
        .map((g) => ({ ...userMap[g.assignedTo], assigned: g._count.id, done: doneMap[g.assignedTo] || 0 }))
        .filter((u) => u.name)
        .sort((a, b) => b.assigned - a.assigned)
    }

    res.json({
      totalTasks: allTasks.length,
      tasksByStatus,
      tasksByPriority,
      tasksByCategory,
      overdueCount,
      completedThisMonth,
      totalWebsites,
      totalProjects,
      recentActivity,
      teamWorkload,
    })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

module.exports = router
