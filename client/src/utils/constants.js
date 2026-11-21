export const ROLE_LABELS = {
  super_admin:       'Super Admin',
  team_lead:         'Team Lead',
  marketing_manager: 'Marketing Manager',
  seo_executive:     'SEO Executive',
  content_writer:    'Content Writer',
  developer:         'Developer',
  client:            'Client',
}

export const ROLE_BADGE_COLORS = {
  super_admin:       'bg-purple-100 text-purple-800 border-purple-200',
  team_lead:         'bg-blue-100 text-blue-800 border-blue-200',
  marketing_manager: 'bg-amber-100 text-amber-800 border-amber-200',
  seo_executive:     'bg-green-100 text-green-800 border-green-200',
  content_writer:    'bg-sky-100 text-sky-800 border-sky-200',
  developer:         'bg-orange-100 text-orange-800 border-orange-200',
  client:            'bg-gray-100 text-gray-700 border-gray-200',
}

export const STATUS_COLORS = {
  backlog:     'bg-gray-100 text-gray-700',
  todo:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  in_review:   'bg-purple-100 text-purple-700',
  done:        'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
}

export const STATUS_LABELS = {
  backlog:     'Backlog',
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'In Review',
  done:        'Done',
  cancelled:   'Cancelled',
}

export const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-yellow-100 text-yellow-700',
  low:      'bg-green-100 text-green-700',
}

export const PRIORITY_LABELS = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
}

export const VALID_ROLES     = Object.keys(ROLE_LABELS)
export const ADMIN_ROLES     = ['super_admin', 'team_lead']
export const MANAGEMENT_ROLES = ['super_admin', 'team_lead', 'marketing_manager']

export const STATUS_FLOW = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

export const PRIORITY_DOT = {
  critical: 'bg-red-500',
  high:     'bg-orange-500',
  medium:   'bg-yellow-400',
  low:      'bg-green-500',
}

export const CATEGORIES = [
  { value: 'on_page',   label: 'On-Page SEO' },
  { value: 'off_page',  label: 'Off-Page SEO' },
  { value: 'technical', label: 'Technical SEO' },
  { value: 'content',   label: 'Content' },
  { value: 'research',  label: 'Research' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'other',     label: 'Other' },
]

export const categoryLabel = (value) =>
  CATEGORIES.find((c) => c.value === value)?.label || value

export const CATEGORY_COLORS = {
  on_page:   'bg-blue-100 text-blue-700',
  off_page:  'bg-purple-100 text-purple-700',
  technical: 'bg-orange-100 text-orange-700',
  content:   'bg-green-100 text-green-700',
  research:  'bg-yellow-100 text-yellow-700',
  reporting: 'bg-gray-100 text-gray-700',
  other:     'bg-gray-100 text-gray-500',
}

// Website / project status
export const WEBSITE_STATUS_BADGE = {
  active:    'bg-green-100 text-green-700',
  paused:    'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-gray-100 text-gray-500',
}

// Summary groups over the real status values (mirrors server STATUS_GROUPS).
// `cancelled` belongs to none and is excluded from totals and completion %.
export const STATUS_GROUPS = {
  pending:    ['backlog', 'todo'],
  inProgress: ['in_progress', 'in_review'],
  completed:  ['done'],
}

// Overdue is derived, never a stored status: due date passed and not done / cancelled
export const isTaskOverdue = (task, now = new Date()) =>
  !!task?.dueDate && new Date(task.dueDate) < now && !['done', 'cancelled'].includes(task.status)

// Quick filters shared by the Dashboard and Tasks pages → /api/tasks params
export const QUICK_FILTERS = [
  { value: 'all',        label: 'All Tasks',   params: {} },
  { value: 'mine',       label: 'My Tasks',    params: { mine: 'true' } },
  { value: 'pending',    label: 'Pending',     params: { statusGroup: 'pending' } },
  { value: 'inProgress', label: 'In Progress', params: { statusGroup: 'inProgress' } },
  { value: 'completed',  label: 'Completed',   params: { statusGroup: 'completed' } },
  { value: 'overdue',    label: 'Overdue',     params: { overdue: 'true' } },
]
export const quickFilterParams = (value) =>
  (QUICK_FILTERS.find((q) => q.value === value) || QUICK_FILTERS[0]).params

// Bar colours for status / priority breakdown charts
export const TASK_STATUS_BAR_COLORS = {
  backlog: 'bg-gray-400', todo: 'bg-blue-400', in_progress: 'bg-yellow-400',
  in_review: 'bg-purple-400', done: 'bg-green-500', cancelled: 'bg-red-300',
}
export const PRIORITY_BAR_COLORS = {
  critical: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-green-400',
}
