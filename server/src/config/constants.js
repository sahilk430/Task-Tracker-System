const VALID_ROLES = [
  'super_admin',
  'team_lead',
  'marketing_manager',
  'seo_executive',
  'content_writer',
  'developer',
  'client',
]

// Convenience role groups
const ADMIN_ROLES      = ['super_admin', 'team_lead']
const MANAGEMENT_ROLES = ['super_admin', 'team_lead', 'marketing_manager']

const WEBSITE_STATUSES = ['active', 'paused', 'completed', 'archived']
const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived']
const TASK_STATUSES    = ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled']
const TASK_PRIORITIES  = ['critical', 'high', 'medium', 'low']
const TASK_CATEGORIES  = ['on_page', 'off_page', 'technical', 'content', 'research', 'reporting', 'other']

// Tasks in these states are never "overdue"
const CLOSED_TASK_STATUSES = ['done', 'cancelled']

// Dashboard / member summary groups over the real status values.
// `cancelled` belongs to no group and is excluded from totals and completion %.
const STATUS_GROUPS = {
  pending:    ['backlog', 'todo'],
  inProgress: ['in_progress', 'in_review'],
  completed:  ['done'],
}
// Every status that counts towards a member's workload
const COUNTED_TASK_STATUSES = Object.values(STATUS_GROUPS).flat()

module.exports = {
  VALID_ROLES,
  ADMIN_ROLES,
  MANAGEMENT_ROLES,
  WEBSITE_STATUSES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_CATEGORIES,
  CLOSED_TASK_STATUSES,
  STATUS_GROUPS,
  COUNTED_TASK_STATUSES,
}
