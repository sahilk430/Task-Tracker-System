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
}
