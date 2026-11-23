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

// In-app notification kinds (see utils/notify.js)
const NOTIFICATION_TYPES = ['assigned', 'status', 'comment', 'mention', 'due_soon', 'overdue', 'digest']

// Uploads (task attachments)
const ATTACHMENT_MAX_BYTES    = 10 * 1024 * 1024
const ATTACHMENTS_PER_TASK    = 20
const ATTACHMENT_ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed',
]

const CHECKLIST_MAX_ITEMS = 50

module.exports = {
  NOTIFICATION_TYPES,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENTS_PER_TASK,
  ATTACHMENT_ALLOWED_TYPES,
  CHECKLIST_MAX_ITEMS,
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
