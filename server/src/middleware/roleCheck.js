const { ADMIN_ROLES, MANAGEMENT_ROLES } = require('../config/constants')

const requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' })
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: 'You do not have permission to perform this action.',
    })
  }
  next()
}

const isAdmin      = (user) => ADMIN_ROLES.includes(user.role)
// Admins and marketing managers can see / manage every task
const canManageAll = (user) => MANAGEMENT_ROLES.includes(user.role)

module.exports = { requireRoles, isAdmin, canManageAll }
