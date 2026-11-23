const express = require('express')
const { body } = require('express-validator')
const { User } = require('../models')
const { authenticate, signToken } = require('../middleware/auth')
const { validate } = require('../middleware/validate')
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimit')
const { HttpError, orNotFound } = require('../utils/httpError')
const { passwordRule } = require('../utils/password')
const { issueResetToken, hashToken, RESET_TTL_MINUTES } = require('../utils/resetToken')
const { sendMail } = require('../utils/mailer')

const router = express.Router()

// POST /api/auth/login
router.post('/login', loginLimiter,
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ]),
  async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email: String(email).trim() }).select('+passwordHash +tokenVersion')

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

// POST /api/auth/forgot-password — always answers the same, so it can't reveal which emails exist
const FORGOT_REPLY = 'If that email belongs to an active account, a reset link is on its way.'
router.post('/forgot-password', passwordResetLimiter,
  validate([body('email').isEmail().withMessage('Valid email is required')]),
  async (req, res) => {
    const user = await User.findOne({ email: String(req.body.email).trim(), isActive: true })
    if (user) {
      const link = issueResetToken(user)
      await user.save()
      await sendMail({
        to: user.email,
        subject: 'Reset your SEO Task Tracker password',
        text: [
          `Hi ${user.name},`, '',
          'Someone (hopefully you) asked to reset your password. Open this link to choose a new one:',
          link, '',
          `The link works once and expires in ${RESET_TTL_MINUTES} minutes. If you didn't ask for this, ignore this email.`,
        ].join('\n'),
      })
    }
    res.json({ message: FORGOT_REPLY })
  }
)

// POST /api/auth/reset-password — { token, password }
router.post('/reset-password', passwordResetLimiter,
  validate([
    body('token').isString().isLength({ min: 64, max: 64 }).withMessage('This reset link is invalid or has expired.'),
    passwordRule('password'),
  ]),
  async (req, res) => {
    const user = await User.findOne({
      resetTokenHash: hashToken(req.body.token),
      resetTokenExpires: { $gt: new Date() },
      isActive: true,
    }).select('+tokenVersion')
    if (!user) throw new HttpError(400, 'This reset link is invalid or has expired.')

    user.passwordHash      = await User.hashPassword(req.body.password)
    user.tokenVersion      = (user.tokenVersion || 0) + 1
    user.resetTokenHash    = undefined
    user.resetTokenExpires = undefined
    await user.save()
    res.json({ message: 'Password updated. You can now sign in.' })
  }
)

module.exports = router
