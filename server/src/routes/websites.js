const express = require('express')
const { body, validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { requireRoles, ADMIN_ROLES } = require('../middleware/roleCheck')

const router = express.Router()
const prisma  = new PrismaClient()

const websiteSelect = {
  id: true, name: true, domain: true, cmsPlatform: true, industry: true,
  ga4PropertyId: true, gscProperty: true, clientName: true, clientEmail: true,
  status: true, notes: true, createdAt: true, updatedAt: true,
  creator: { select: { id: true, name: true } },
  members: { select: { user: { select: { id: true, name: true, email: true, role: true } }, assignedAt: true } },
  _count: { select: { tasks: true, projects: true } },
}

// GET /api/websites
router.get('/', authenticate, async (req, res) => {
  try {
    const isAdmin = ADMIN_ROLES.includes(req.user.role)
    const where   = isAdmin ? {} : { members: { some: { userId: req.user.id } } }
    if (req.query.status) where.status = req.query.status

    const websites = await prisma.website.findMany({ where, select: websiteSelect, orderBy: { createdAt: 'desc' } })
    res.json({ websites })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// GET /api/websites/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const website = await prisma.website.findUnique({ where: { id: req.params.id }, select: websiteSelect })
    if (!website) return res.status(404).json({ message: 'Website not found.' })
    const isAdmin  = ADMIN_ROLES.includes(req.user.role)
    const isMember = website.members.some((m) => m.user.id === req.user.id)
    if (!isAdmin && !isMember) return res.status(403).json({ message: 'Access denied.' })
    res.json({ website })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// POST /api/websites
router.post('/', authenticate, requireRoles(...ADMIN_ROLES),
  [
    body('name').trim().notEmpty().withMessage('Website name is required'),
    body('domain').trim().notEmpty().withMessage('Domain is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
    const { name, domain, cmsPlatform, industry, ga4PropertyId, gscProperty, clientName, clientEmail, notes } = req.body
    try {
      const website = await prisma.website.create({
        data: { name, domain, cmsPlatform, industry, ga4PropertyId, gscProperty, clientName, clientEmail, notes, createdBy: req.user.id },
        select: websiteSelect,
      })
      res.status(201).json({ website, message: 'Website created successfully.' })
    } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
  }
)

// PUT /api/websites/:id
router.put('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const existing = await prisma.website.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Website not found.' })
    const fields = ['name','domain','cmsPlatform','industry','ga4PropertyId','gscProperty','clientName','clientEmail','notes','status']
    const data = {}
    fields.forEach((f) => { if (req.body[f] !== undefined) data[f] = req.body[f] })
    const website = await prisma.website.update({ where: { id: req.params.id }, data, select: websiteSelect })
    res.json({ website, message: 'Website updated successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// DELETE /api/websites/:id (archive)
router.delete('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const existing = await prisma.website.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Website not found.' })
    await prisma.website.update({ where: { id: req.params.id }, data: { status: 'archived' } })
    res.json({ message: 'Website archived successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// POST /api/websites/:id/members
router.post('/:id/members', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ message: 'userId is required.' })
    await prisma.websiteMember.upsert({
      where: { websiteId_userId: { websiteId: req.params.id, userId } },
      update: {},
      create: { websiteId: req.params.id, userId },
    })
    res.json({ message: 'Member assigned successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

// DELETE /api/websites/:id/members/:userId
router.delete('/:id/members/:userId', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    await prisma.websiteMember.deleteMany({ where: { websiteId: req.params.id, userId: req.params.userId } })
    res.json({ message: 'Member removed successfully.' })
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error.' }) }
})

module.exports = router
