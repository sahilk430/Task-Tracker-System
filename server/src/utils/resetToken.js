const crypto = require('crypto')
const { appUrl } = require('./mailer')

const RESET_TTL_MINUTES = 60

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

// Creates a one-time reset token on `user` (caller saves). Returns the reset link.
function issueResetToken(user) {
  const token = crypto.randomBytes(32).toString('hex')
  user.resetTokenHash    = hashToken(token)
  user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000)
  return appUrl(`/reset-password?token=${token}`)
}

module.exports = { issueResetToken, hashToken, RESET_TTL_MINUTES }
