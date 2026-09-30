const express = require('express')
const bcrypt = require('bcryptjs')
const { body, validationResult } = require('express-validator')
const { PrismaClient } = require('@prisma/client')
const { authenticate } = require('../middleware/auth')
const { requireRoles, ADMIN_ROLES, VALID_ROLES } = require('../middleware/roleCheck')

const router = express.Router()
const prisma = new PrismaClient()

const safeSelect = {
  id: true, name: true, email: true, role: true,
  avatarUrl: true, isActive: true, createdAt: true, updatedAt: true,
}

// GET /api/users
router.get('/', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const { role, isActive, search } = req.query
    const where = {}
    if (role) where.role = role
    if (isActive !== undefined) where.isActive = isActive === 'true'
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ]
    }
    const users = await prisma.user.findMany({ where, select: safeSelect, orderBy: { createdAt: 'desc' } })
    res.json({ users })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role) && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: safeSelect })
    if (!user) return res.status(404).json({ message: 'User not found.' })
    res.json({ user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error.' })
  }
})

// POST /api/users
router.post(
  '/',
  authenticate,
  requireRoles(...ADMIN_ROLES),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(VALID_ROLES).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

    const { name, email, password, role } = req.body
    try {
      const existing = await prisma.user.findUnique({ where: { email } })
      if (existing) return res.status(409).json({ message: 'A user with this email already exists.' })

      const passwordHash = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({ data: { name, email, passwordHash, role }, select: safeSelect })
      res.status(201).json({ user, message: 'User created successfully.' })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error.' })
    }
  }
)

// PUT /api/users/:id
router.put(
  '/:id',
  authenticate,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(VALID_ROLES).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })

    if (!ADMIN_ROLES.includes(req.user.role) && req.user.id !== req.params.id) {
      return res.status(403).json({ message: 'Access denied.' })
    }
    if (!ADMIN_ROLES.includes(req.user.role) && req.body.role) {
      return res.status(403).json({ message: 'You cannot change your own role.' })
    }

    try {
      const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
      if (!existing) return res.status(404).json({ message: 'User not found.' })

      const data = {}
      if (req.body.name)     data.name = req.body.name
      if (req.body.email)    data.email = req.body.email
      if (req.body.role)     data.role = req.body.role
      if (req.body.password) data.passwordHash = await bcrypt.hash(req.body.password, 10)

      const user = await prisma.user.update({ where: { id: req.params.id }, data, select: safeSelect })
      res.json({ user, message: 'User updated successfully.' })
    } catch (err) {
      console.error(err)
      res.status(500).json({ message: 'Server error.' })
    }
  }
)

// PATCH /api/users/:id/toggle-active
router.patch('/:id/toggle-active', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'User not found.' })
    if (existing.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot deactivate your own account.' })
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
      select: safeSelect,
    })
    res.json({ user, message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error.' })
  }
})

module.exports = router
