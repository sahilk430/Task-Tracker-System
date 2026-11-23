const express = require('express')
const { body } = require('express-validator')
const { User } = require('../models')
const { authenticate } = require('../middleware/auth')
const { requireRoles, isAdmin } = require('../middleware/roleCheck')
const { validate } = require('../middleware/validate')
const { ADMIN_ROLES, VALID_ROLES } = require('../config/constants')
const { HttpError, orNotFound } = require('../utils/httpError')
const { pick, containsRegex } = require('../utils/parse')
const { passwordRule } = require('../utils/password')
const { issueResetToken, RESET_TTL_MINUTES } = require('../utils/resetToken')

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
    passwordRule('password'),
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
    passwordRule('password').optional(),
    body('role').optional().isIn(VALID_ROLES).withMessage('Invalid role'),
  ]),
  async (req, res) => {
    if (!canAccessUser(req.user, req.params.id)) throw new HttpError(403, 'Access denied.')
    if (!isAdmin(req.user) && req.body.role) throw new HttpError(403, 'You cannot change your own role.')

    const user = orNotFound(await User.findById(req.params.id).select('+tokenVersion'), 'User')
    user.set(pick(req.body, ['name', 'email', 'role']))
    if (req.body.password) {
      user.passwordHash = await User.hashPassword(req.body.password)
      // Someone else changed it (an admin) → sign that user out everywhere
      if (user.id !== req.user.id) user.tokenVersion = (user.tokenVersion || 0) + 1
    }

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

// POST /api/users/:id/reset-link — admin creates a one-time reset link to hand over
// (works without email being configured)
router.post('/:id/reset-link', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const user = orNotFound(await User.findById(req.params.id), 'User')
  if (!user.isActive) throw new HttpError(400, 'Activate this user before resetting their password.')
  const link = issueResetToken(user)
  await user.save()
  res.json({ link, expiresInMinutes: RESET_TTL_MINUTES })
})

module.exports = router
