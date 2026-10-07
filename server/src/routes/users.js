const express = require('express')
const { body } = require('express-validator')
const { User } = require('../models')
const { authenticate } = require('../middleware/auth')
const { requireRoles, isAdmin } = require('../middleware/roleCheck')
const { validate } = require('../middleware/validate')
const { ADMIN_ROLES, VALID_ROLES } = require('../config/constants')
const { HttpError, orNotFound } = require('../utils/httpError')
const { pick, containsRegex } = require('../utils/parse')

const router = express.Router()

const canAccessUser = (reqUser, userId) => isAdmin(reqUser) || reqUser.id === userId

// GET /api/users
router.get('/', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const { role, isActive, search } = req.query
  const filter = {}
  if (role) filter.role = role
  if (isActive !== undefined) filter.isActive = isActive === 'true'
  if (search) filter.$or = [{ name: containsRegex(search) }, { email: containsRegex(search) }]

  const users = await User.find(filter).sort({ createdAt: -1 })
  res.json({ users })
})

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
  if (!canAccessUser(req.user, req.params.id)) throw new HttpError(403, 'Access denied.')
  const user = orNotFound(await User.findById(req.params.id), 'User')
  res.json({ user })
})

// POST /api/users
router.post('/', authenticate, requireRoles(...ADMIN_ROLES),
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(VALID_ROLES).withMessage('Invalid role'),
  ]),
  async (req, res) => {
    // A duplicate email hits the unique index → 409 from the error handler
    const { name, email, password, role } = req.body
    const passwordHash = await User.hashPassword(password)
    const user = await User.create({ name, email, passwordHash, role })
    res.status(201).json({ user, message: 'User created successfully.' })
  }
)

// PUT /api/users/:id
router.put('/:id', authenticate,
  validate([
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(VALID_ROLES).withMessage('Invalid role'),
  ]),
  async (req, res) => {
    if (!canAccessUser(req.user, req.params.id)) throw new HttpError(403, 'Access denied.')
    if (!isAdmin(req.user) && req.body.role) throw new HttpError(403, 'You cannot change your own role.')

    const user = orNotFound(await User.findById(req.params.id), 'User')
    user.set(pick(req.body, ['name', 'email', 'role']))
    if (req.body.password) user.passwordHash = await User.hashPassword(req.body.password)

    await user.save()
    res.json({ user, message: 'User updated successfully.' })
  }
)

// PATCH /api/users/:id/toggle-active
router.patch('/:id/toggle-active', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const user = orNotFound(await User.findById(req.params.id), 'User')
  if (user.id === req.user.id) throw new HttpError(400, 'You cannot deactivate your own account.')

  user.isActive = !user.isActive
  await user.save()
  res.json({ user, message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.` })
})

module.exports = router
