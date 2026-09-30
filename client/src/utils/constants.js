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
