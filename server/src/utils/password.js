const { body } = require('express-validator')

const PASSWORD_MESSAGE = 'Password must be at least 8 characters and include a letter and a number.'
const isStrongPassword = (v) => typeof v === 'string' && v.length >= 8 && v.length <= 128 && /[A-Za-z]/.test(v) && /\d/.test(v)

// express-validator rule for a new password field
const passwordRule = (field = 'password') => body(field).custom(isStrongPassword).withMessage(PASSWORD_MESSAGE)

module.exports = { isStrongPassword, passwordRule, PASSWORD_MESSAGE }
