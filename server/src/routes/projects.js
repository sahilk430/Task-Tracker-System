const express = require('express')
const { body } = require('express-validator')
const { Project, Task, Website } = require('../models')
const { authenticate } = require('../middleware/auth')
const { requireRoles, canManageAll } = require('../middleware/roleCheck')
const { validate } = require('../middleware/validate')
const { ADMIN_ROLES } = require('../config/constants')
const { HttpError, orNotFound } = require('../utils/httpError')
const { pick } = require('../utils/parse')
const { withCounts } = require('../utils/countBy')
const { countIf } = require('../utils/taskStats')
const { CLOSED_TASK_STATUSES } = require('../config/constants')

const router = express.Router()

const EDITABLE_FIELDS = ['name', 'goal', 'status', 'startDate', 'endDate']
const POPULATE = { path: 'website', select: 'name domain' }
const COUNTS   = { tasks: [Task, 'project'] }

// Populated JSON with `_count`, as returned by every project endpoint
const present = async (project) => (await withCounts([await project.populate(POPULATE)], COUNTS))[0]

// Managers see every website's projects; others only those of websites they are a member of
async function assertWebsiteAccess(user, websiteId) {
  if (canManageAll(user)) return
  if (!(await Website.exists({ _id: websiteId, 'members.user': user.id }))) {
    throw new HttpError(403, 'Access denied.')
  }
}

// Task progress per project: { [projectId]: { total, completed, overdue, completionRate } }
// (cancelled tasks don't count, overdue = due date passed and not done / cancelled)
async function projectProgress(projectIds, now = new Date()) {
  const groups = await Task.aggregate([
    { $match: { project: { $in: projectIds }, status: { $ne: 'cancelled' } } },
    { $group: {
      _id: '$project',
      total:     { $sum: 1 },
      completed: countIf({ $eq: ['$status', 'done'] }),
      overdue:   countIf({ $and: [
        { $eq: [{ $type: '$dueDate' }, 'date'] },
        { $lt: ['$dueDate', now] },
        { $not: [{ $in: ['$status', CLOSED_TASK_STATUSES] }] },
      ] }),
    } },
  ])
  return Object.fromEntries(groups.map(({ _id, ...g }) => [
    _id.toString(), { ...g, completionRate: g.total ? Math.round((g.completed / g.total) * 100) : 0 },
  ]))
}
const EMPTY_PROGRESS = { total: 0, completed: 0, overdue: 0, completionRate: 0 }

// GET /api/projects?websiteId=xxx
router.get('/', authenticate, async (req, res) => {
  const { websiteId } = req.query
  if (typeof websiteId !== 'string' || !websiteId) throw new HttpError(400, 'websiteId query param is required.')
  await assertWebsiteAccess(req.user, websiteId)

  const projects = await Project.find({ website: websiteId }).populate(POPULATE).sort({ createdAt: -1 })
  const progress = await projectProgress(projects.map((p) => p._id))
  const list = await withCounts(projects, COUNTS)
  res.json({ projects: list.map((p) => ({ ...p, progress: progress[p.id] || EMPTY_PROGRESS })) })
})

// GET /api/projects/:id
router.get('/:id', authenticate, async (req, res) => {
  const project = orNotFound(await Project.findById(req.params.id), 'Project')
  await assertWebsiteAccess(req.user, project.website)
  res.json({ project: await present(project) })
})

// POST /api/projects
router.post('/', authenticate, requireRoles(...ADMIN_ROLES),
  validate([
    body('websiteId').notEmpty().withMessage('websiteId is required'),
    body('name').trim().notEmpty().withMessage('Project name is required'),
  ]),
  async (req, res) => {
    const project = await Project.create({
      ...pick(req.body, EDITABLE_FIELDS),
      website: req.body.websiteId,
      creator: req.user.id,
    })
    res.status(201).json({ project: await present(project), message: 'Project created successfully.' })
  }
)

// PUT /api/projects/:id
router.put('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const project = orNotFound(await Project.findById(req.params.id), 'Project')
  project.set(pick(req.body, EDITABLE_FIELDS))
  await project.save()
  res.json({ project: await present(project), message: 'Project updated successfully.' })
})

// DELETE /api/projects/:id — tasks stay, but are detached from the project
router.delete('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const project = orNotFound(await Project.findById(req.params.id), 'Project')
  await Task.updateMany({ project: project._id }, { project: null })
  await project.deleteOne()
  res.json({ message: 'Project deleted successfully.' })
})

module.exports = router
