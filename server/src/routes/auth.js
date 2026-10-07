const express = require('express')
const { body } = require('express-validator')
const { User } = require('../models')
const { authenticate, signToken } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { HttpError, orNotFound } = require('../utils/httpError')

const router = express.Router()

// POST /api/auth/login
router.post('/login',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+passwordHash')

    if (!user || !(await user.checkPassword(password))) {
      throw new HttpError(401, 'Invalid email or password.')
    }
    if (!user.isActive) {
      throw new HttpError(403, 'Your account has been deactivated. Contact your admin.')
    }

    res.json({ token: signToken(user), user })
  }
)

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const user = orNotFound(await User.findById(req.user.id), 'User')
  res.json({ user })
})

module.exports = router
