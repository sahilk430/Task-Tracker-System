const { HttpError } = require('../utils/httpError')

const notFound = (req, res) => {
  res.status(404).json({ message: 'Route not found' })
}

// Express 5 forwards rejected promises from async handlers here
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message })
  }
  // Malformed values — on queries a CastError is thrown directly, on save() it is wrapped
  // in a ValidationError. Model path names mean nothing to the client, so ids get a generic message.
  const cause = err.name === 'ValidationError' ? Object.values(err.errors)[0] : err
  if (cause.name === 'CastError') {
    return res.status(400).json({ message: cause.kind === 'ObjectId' ? 'Invalid id.' : `Invalid ${cause.path}.` })
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: cause.message })
  }
  // Unique index violation, e.g. { email: '…' }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value'
    return res.status(409).json({ message: `A record with this ${field} already exists.` })
  }

  console.error(err)
  res.status(500).json({ message: 'Server error.' })
}

module.exports = { notFound, errorHandler }
