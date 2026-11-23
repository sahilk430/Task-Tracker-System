const jwt = require('jsonwebtoken')
const { isValidObjectId } = require('mongoose')
const { User } = require('../models')

const deny = (res, message) => res.status(401).json({ message })

// Verifies the JWT, then re-reads the user so that deactivated accounts, role changes
// and password resets take effect immediately instead of when the token expires.
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return deny(res, 'Authentication required. No token provided.')
  }

  let payload
  try {
    payload = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET)
  } catch (err) {
    return deny(res, err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.')
  }
  if (!isValidObjectId(payload.id)) return deny(res, 'Invalid token.')

  const user = await User.findById(payload.id).select('name email role isActive +tokenVersion').lean()
  if (!user || !user.isActive) return deny(res, 'Your account is not active. Contact your admin.')
  // Tokens from before the user's latest password reset (older tokens have no `v` → 0)
  if ((payload.v || 0) !== (user.tokenVersion || 0)) {
    return deny(res, 'Your password was changed. Please log in again.')
  }

  req.user = { id: String(user._id), name: user.name, email: user.email, role: user.role }
  next()
}

// `user` must be loaded with +tokenVersion
const signToken = (user) => jwt.sign(
  { id: user.id, name: user.name, email: user.email, role: user.role, v: user.tokenVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
)

module.exports = { authenticate, signToken }
