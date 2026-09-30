const express = require('express')
const { body, validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { requireRoles, ADMIN_ROLES } = require('../middleware/roleCheck')

const router = express.Router()
const prisma  = new PrismaClient()

const projectSelect = {
  id: true, name: true, goal: true, startDate: true, endDate: true,
  status: true, createdAt: true, updatedAt: true,
  website:  { select: { id: true, name: true, domain: true } },
  creator:  { select: { id: true, name: true } },
  _count:   { select: { tasks: true } },
}

// GET /api/projects?websiteId=xxx
router.get('/', authenticate, async (req, res) => {
  try {
    const { websiteId } = req.query
    if (!websiteId) return res.status(400).json({ message: 'websiteId query param is required.' })
    const projects = await prisma.project.findMany({
      where: { websiteId },
      select: projectSelect,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ projects })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// GET /api/projects/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id }, select: projectSelect })
    if (!project) return res.status(404).json({ message: 'Project not found.' })
    res.json({ project })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// POST /api/projects
router.post('/', authenticate, requireRoles(...ADMIN_ROLES),
  [
    body('websiteId').notEmpty().withMessage('websiteId is required'),
    body('name').trim().notEmpty().withMessage('Project name is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
    const { websiteId, name, goal, startDate, endDate, status } = req.body
    try {
      const project = await prisma.project.create({
        data: {
          websiteId, name, goal,
          startDate: startDate ? new Date(startDate) : null,
          endDate:   endDate   ? new Date(endDate)   : null,
          status:    status || 'active',
          createdBy: req.user.id,
        },
        select: projectSelect,
      })
      res.status(201).json({ project, message: 'Project created successfully.' })
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
  }
)

// PUT /api/projects/:id
router.put('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Project not found.' })
    const { name, goal, startDate, endDate, status } = req.body
    const data = {}
    if (name !== undefined)      data.name      = name
    if (goal !== undefined)      data.goal      = goal
    if (status !== undefined)    data.status    = status
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined)   data.endDate   = endDate   ? new Date(endDate)   : null
    const project = await prisma.project.update({ where: { id: req.params.id }, data, select: projectSelect })
    res.json({ project, message: 'Project updated successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// DELETE /api/projects/:id
router.delete('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Project not found.' })
    await prisma.project.delete({ where: { id: req.params.id } })
    res.json({ message: 'Project deleted successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

module.exports = router
