const express = require('express')
const { body } = require('express-validator')
const { Project, Task } = require('../models')
const { authenticate } = require('../middleware/auth')
const { requireRoles } = require('../middleware/roleCheck')
const { validate } = require('../middleware/validate')
const { ADMIN_ROLES } = require('../config/constants')
const { HttpError, orNotFound } = require('../utils/httpError')
const { pick } = require('../utils/parse')
const { withCounts } = require('../utils/countBy')

const router = express.Router()

const EDITABLE_FIELDS = ['name', 'goal', 'status', 'startDate', 'endDate']
const POPULATE = { path: 'website', select: 'name domain' }
const COUNTS   = { tasks: [Task, 'project'] }

// Populated JSON with `_count`, as returned by every project endpoint
const present = async (project) => (await withCounts([await project.populate(POPULATE)], COUNTS))[0]

// GET /api/projects?websiteId=xxx
router.get('/', authenticate, async (req, res) => {
  const { websiteId } = req.query
  if (!websiteId) throw new HttpError(400, 'websiteId query param is required.')

  const projects = await Project.find({ website: websiteId }).populate(POPULATE).sort({ createdAt: -1 })
  res.json({ projects: await withCounts(projects, COUNTS) })
})

// GET /api/projects/:id
router.get('/:id', authenticate, async (req, res) => {
  res.json({ project: await present(orNotFound(await Project.findById(req.params.id), 'Project')) })
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
