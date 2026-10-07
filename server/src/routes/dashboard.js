const express = require('express')
const { Task, Website, Project, TaskActivity, User } = require('../models')
const { authenticate } = require('../middleware/auth')
const { canManageAll } = require('../middleware/roleCheck')
const { CLOSED_TASK_STATUSES } = require('../config/constants')

const router = express.Router()

// { status: { [value]: count }, priority: {…}, category: {…} } in one pass
function tallyTasks(tasks) {
  const tally = { status: {}, priority: {}, category: {} }
  for (const task of tasks) {
    for (const field in tally) tally[field][task[field]] = (tally[field][task[field]] || 0) + 1
  }
  return tally
}

// Assigned vs done counts per assignee, busiest first
async function getTeamWorkload() {
  const groups = await Task.aggregate([
    { $group: {
      _id:      '$assignee',
      assigned: { $sum: 1 },
      done:     { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
    } },
    { $sort: { assigned: -1 } },
  ])
  const users   = await User.find({ _id: { $in: groups.map((g) => g._id) } }).select('name role')
  const userMap = new Map(users.map((u) => [u.id, u]))

  return groups
    .filter((g) => userMap.has(g._id.toString()))
    .map((g) => {
      const { id, name, role } = userMap.get(g._id.toString())
      return { id, name, role, assigned: g.assigned, done: g.done }
    })
}

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  const canSeeAll  = canManageAll(req.user)
  const taskFilter = canSeeAll ? {} : { assignee: req.user.id }
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // .exec() → a real Promise, so it can be awaited twice (a Query would re-run and throw)
  const tasksPromise = Task.find(taskFilter).select('status priority category').lean().exec()
  // Non-managers only see activity on their own tasks — reuse the task query for the ids
  const activityPromise = tasksPromise.then((tasks) =>
    TaskActivity.find(canSeeAll ? {} : { task: { $in: tasks.map((t) => t._id) } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name')
      .populate('task', 'title')
  )

  const [tasks, overdueCount, completedThisMonth, totalWebsites, totalProjects, recentActivity, teamWorkload] =
    await Promise.all([
      tasksPromise,
      Task.countDocuments({ ...taskFilter, dueDate: { $lt: now }, status: { $nin: CLOSED_TASK_STATUSES } }),
      Task.countDocuments({ ...taskFilter, status: 'done', updatedAt: { $gte: monthStart } }),
      canSeeAll ? Website.countDocuments({ status: { $ne: 'archived' } }) : null,
      canSeeAll ? Project.countDocuments() : null,
      activityPromise,
      canSeeAll ? getTeamWorkload() : null,
    ])

  const tally = tallyTasks(tasks)
  res.json({
    totalTasks:      tasks.length,
    tasksByStatus:   tally.status,
    tasksByPriority: tally.priority,
    tasksByCategory: tally.category,
    overdueCount,
    completedThisMonth,
    totalWebsites,
    totalProjects,
    recentActivity,
    teamWorkload,
  })
})

module.exports = router
