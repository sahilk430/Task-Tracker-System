const { validationResult } = require('express-validator')

// Runs express-validator rules, then answers 400 with the first error message
const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg })
    next()
  },
]

module.exports = { validate }
