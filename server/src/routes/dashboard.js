const express = require('express')
const { Types } = require('mongoose')
const { Task, Website, Project, User } = require('../models')
const { authenticate } = require('../middleware/auth')
const { canManageAll } = require('../middleware/roleCheck')
const { taskSummary, recentActivity } = require('../utils/taskStats')

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
  // ObjectId, not the JWT string: aggregate() (taskSummary) does not cast ids like find() does
  const taskFilter = canSeeAll ? {} : { assignee: new Types.ObjectId(String(req.user.id)) }
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // .exec() → a real Promise, so it can be awaited twice (a Query would re-run and throw)
  const tasksPromise = Task.find(taskFilter).select('status priority category').lean().exec()
  // Non-managers only see activity on their own tasks — reuse the task query for the ids
  const activityPromise = tasksPromise.then((tasks) =>
    recentActivity(canSeeAll ? {} : { task: { $in: tasks.map((t) => t._id) } }, 15)
  )

  const [tasks, summary, completedThisMonth, totalWebsites, totalProjects, activity, teamWorkload] =
    await Promise.all([
      tasksPromise,
      taskSummary(taskFilter, now),
      // completedAt is the real completion time; tasks finished before it existed fall back to updatedAt
      Task.countDocuments({ ...taskFilter, status: 'done', $or: [
        { completedAt: { $gte: monthStart } },
        { completedAt: null, updatedAt: { $gte: monthStart } },
      ] }),
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
    overdueCount:    summary.overdue,
    // total / completed / pending / inProgress / overdue / cancelled / completionRate
    summary,
    completedThisMonth,
    totalWebsites,
    totalProjects,
    recentActivity:  activity,
    teamWorkload,
  })
})

module.exports = router
