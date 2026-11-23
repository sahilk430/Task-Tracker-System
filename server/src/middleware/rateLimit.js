const { rateLimit } = require('express-rate-limit')

const WINDOW = 15 * 60 * 1000
const message = (text) => ({ message: text })
const emailOf = (req) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '')

// Failed logins per IP + email (successful logins don't count)
const loginLimiter = rateLimit({
  windowMs: WINDOW,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${emailOf(req)}`,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many failed login attempts. Try again in 15 minutes.'),
})

// Forgot / reset password requests per IP
const passwordResetLimiter = rateLimit({
  windowMs: WINDOW,
  limit: Number(process.env.RESET_RATE_LIMIT) || 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many password reset requests. Try again in 15 minutes.'),
})

// Every API request per IP — generous, only stops runaway clients / scripts
const apiLimiter = rateLimit({
  windowMs: WINDOW,
  limit: Number(process.env.API_RATE_LIMIT) || 2000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: message('Too many requests. Please slow down.'),
})

module.exports = { loginLimiter, passwordResetLimiter, apiLimiter }
