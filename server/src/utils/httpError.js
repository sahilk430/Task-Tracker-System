// Throw from a route handler to send `{ message }` with the given status
class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// Returns `doc`, or throws a 404 when it is null
function orNotFound(doc, name) {
  if (!doc) throw new HttpError(404, `${name} not found.`)
  return doc
}

module.exports = { HttpError, orNotFound }
