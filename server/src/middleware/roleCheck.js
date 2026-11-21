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
// Admins and marketing managers can see / manage every task and every member.
// This is the single rule for task visibility (list, detail, comments, dashboard, members).
const canManageAll = (user) => MANAGEMENT_ROLES.includes(user.role)

// Task-level access: managers see everything, everyone else only their assigned tasks
const canAccessTask = (user, task) => {
  if (canManageAll(user)) return true
  const assignee = task.assignee?._id ?? task.assignee
  return String(assignee) === String(user.id)
}

module.exports = { requireRoles, isAdmin, canManageAll, canAccessTask }
