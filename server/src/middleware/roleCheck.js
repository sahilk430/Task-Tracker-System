const VALID_ROLES = [
  'super_admin',
  'team_lead',
  'marketing_manager',
  'seo_executive',
  'content_writer',
  'developer',
  'client',
]

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

// Convenience role groups
const ADMIN_ROLES        = ['super_admin', 'team_lead']
const MANAGEMENT_ROLES   = ['super_admin', 'team_lead', 'marketing_manager']
const ALL_STAFF_ROLES    = VALID_ROLES.filter((r) => r !== 'client')

module.exports = { requireRoles, ADMIN_ROLES, MANAGEMENT_ROLES, ALL_STAFF_ROLES, VALID_ROLES }
