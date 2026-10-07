const express = require('express')
const { body } = require('express-validator')
const { Website, Project, Task, User } = require('../models')
const { authenticate } = require('../middleware/auth')
const { requireRoles, isAdmin } = require('../middleware/roleCheck')
const { validate } = require('../middleware/validate')
const { ADMIN_ROLES } = require('../config/constants')
const { HttpError, orNotFound } = require('../utils/httpError')
const { pick } = require('../utils/parse')
const { withCounts } = require('../utils/countBy')

const router = express.Router()

const EDITABLE_FIELDS = [
  'name', 'domain', 'cmsPlatform', 'industry', 'ga4PropertyId',
  'gscProperty', 'clientName', 'clientEmail', 'notes', 'status',
]

const POPULATE = [
  { path: 'creator', select: 'name' },
  { path: 'members.user', select: 'name email role' },
]
const COUNTS = { tasks: [Task, 'website'], projects: [Project, 'website'] }

// Populated JSON with `_count`, as returned by every website endpoint
const present = async (website) => (await withCounts([await website.populate(POPULATE)], COUNTS))[0]

// GET /api/websites
router.get('/', authenticate, async (req, res) => {
  const filter = isAdmin(req.user) ? {} : { 'members.user': req.user.id }
  if (req.query.status) filter.status = req.query.status

  const websites = await Website.find(filter).populate(POPULATE).sort({ createdAt: -1 })
  res.json({ websites: await withCounts(websites, COUNTS) })
})

// GET /api/websites/:id
router.get('/:id', authenticate, async (req, res) => {
  const website = await present(orNotFound(await Website.findById(req.params.id), 'Website'))
  const isMember = website.members.some((m) => m.user?.id === req.user.id)
  if (!isAdmin(req.user) && !isMember) throw new HttpError(403, 'Access denied.')
  res.json({ website })
})

// POST /api/websites
router.post('/', authenticate, requireRoles(...ADMIN_ROLES),
  validate([
    body('name').trim().notEmpty().withMessage('Website name is required'),
    body('domain').trim().notEmpty().withMessage('Domain is required'),
  ]),
  async (req, res) => {
    const fields  = pick(req.body, EDITABLE_FIELDS.filter((f) => f !== 'status'))
    const website = await Website.create({ ...fields, creator: req.user.id })
    res.status(201).json({ website: await present(website), message: 'Website created successfully.' })
  }
)

// PUT /api/websites/:id
router.put('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const website = orNotFound(await Website.findById(req.params.id), 'Website')
  website.set(pick(req.body, EDITABLE_FIELDS))
  await website.save()
  res.json({ website: await present(website), message: 'Website updated successfully.' })
})

// DELETE /api/websites/:id (archive)
router.delete('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const website = orNotFound(await Website.findById(req.params.id), 'Website')
  website.status = 'archived'
  await website.save()
  res.json({ message: 'Website archived successfully.' })
})

// POST /api/websites/:id/members
router.post('/:id/members', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const { userId } = req.body
  if (!userId) throw new HttpError(400, 'userId is required.')
  const [websiteExists, userExists] = await Promise.all([
    Website.exists({ _id: req.params.id }),
    User.exists({ _id: userId }),
  ])
  orNotFound(websiteExists, 'Website')
  orNotFound(userExists, 'User')

  // Only push when the user is not already a member
  await Website.updateOne(
    { _id: req.params.id, 'members.user': { $ne: userId } },
    { $push: { members: { user: userId } } },
  )
  res.json({ message: 'Member assigned successfully.' })
})

// DELETE /api/websites/:id/members/:userId
router.delete('/:id/members/:userId', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  await Website.updateOne({ _id: req.params.id }, { $pull: { members: { user: req.params.userId } } })
  res.json({ message: 'Member removed successfully.' })
})

module.exports = router
