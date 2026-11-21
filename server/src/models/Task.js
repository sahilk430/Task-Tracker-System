const { Schema, model } = require('mongoose')
const {
  TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES, STATUS_GROUPS, CLOSED_TASK_STATUSES,
} = require('../config/constants')
const { schemaOptions, ref } = require('./schemaOptions')
const { pick } = require('../utils/parse')

const taskSchema = new Schema({
  title:          { type: String, required: true, trim: true },
  description:    String,
  website:        ref('Website', { required: true, index: true }),
  project:        ref('Project', { default: null, index: true }),
  category:       { type: String, enum: TASK_CATEGORIES, required: true },
  status:         { type: String, enum: TASK_STATUSES, default: 'backlog' },
  priority:       { type: String, enum: TASK_PRIORITIES, default: 'medium' },
  assignee:       ref('User', { required: true }),
  creator:        ref('User', { required: true }),
  dueDate:        Date,
  startDate:      Date,
  // Set automatically when status becomes `done`, cleared when it leaves `done`
  completedAt:    { type: Date, default: null },
  estimatedHours: Number,
  actualHours:    Number,

  // SEO-specific fields
  targetUrl:            String,
  targetKeywords:       String,
  searchIntent:         String,
  currentRanking:       Number,
  targetRanking:        Number,
  expectedResult:       String,
  actualResult:         String,
  gscImpressionsBefore: Number,
  gscImpressionsAfter:  Number,
  gscClicksBefore:      Number,
  gscClicksAfter:       Number,
  backlinksCount:       Number,
  toolsUsed:            String,
  tags:                 String,
}, schemaOptions)

// "My tasks" list: filtered by assignee, newest first
taskSchema.index({ assignee: 1, createdAt: -1 })

// Keep completedAt in step with status (never trusted from the request body)
taskSchema.pre('save', function () {
  if (!this.isNew && !this.isModified('status')) return
  if (this.status === 'done') {
    if (!this.completedAt) this.completedAt = new Date()
  } else {
    this.completedAt = null
  }
})

// ── API ↔ model mapping ─────────────────────────────────────────────
// The API speaks `websiteId` / `projectId` / `assignedTo`; the model stores refs.

// Plain fields any task editor may set
const EDITABLE_FIELDS = [
  'title', 'description', 'category', 'status',
  'dueDate', 'startDate', 'estimatedHours', 'actualHours',
  'targetUrl', 'targetKeywords', 'searchIntent', 'currentRanking', 'targetRanking',
  'expectedResult', 'actualResult', 'toolsUsed', 'tags', 'backlinksCount',
  'gscImpressionsBefore', 'gscImpressionsAfter', 'gscClicksBefore', 'gscClicksAfter',
]

// Query params accepted by list/report endpoints → model fields
const QUERY_FILTERS = {
  websiteId: 'website', projectId: 'project', assignedTo: 'assignee',
  status: 'status', priority: 'priority', category: 'category',
}

// Request body → Task fields (only keys present). Only managers may change priority / assignee.
taskSchema.statics.fieldsFromBody = function (body, { canManage }) {
  const data = pick(body, EDITABLE_FIELDS)
  if (body.websiteId !== undefined) data.website = body.websiteId
  if (body.projectId !== undefined) data.project = body.projectId || null
  if (canManage && body.priority !== undefined)   data.priority = body.priority
  if (canManage && body.assignedTo !== undefined) data.assignee = body.assignedTo
  return data
}

// Mongo condition for "overdue": due date passed and not done / cancelled.
// Overdue is always derived — it is never stored as a status.
taskSchema.statics.overdueFilter = (now = new Date()) => ({
  dueDate: { $lt: now },
  status:  { $nin: CLOSED_TASK_STATUSES },
})

const isDay = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

// Query string → Mongo filter (empty params are ignored)
//   statusGroup=pending|inProgress|completed → status in that group
//   overdue=true                             → overdueFilter()
//   dueFrom / dueTo (YYYY-MM-DD)             → dueDate range, inclusive
taskSchema.statics.filterFromQuery = function (query) {
  const filter = {}
  for (const [param, field] of Object.entries(QUERY_FILTERS)) {
    // Strings only, so `?status[$ne]=x` can't inject an operator
    if (typeof query[param] === 'string' && query[param]) filter[field] = query[param]
  }

  if (!filter.status && STATUS_GROUPS[query.statusGroup]) {
    filter.status = { $in: STATUS_GROUPS[query.statusGroup] }
  }

  const conditions = []
  if (query.overdue === 'true') conditions.push(this.overdueFilter())

  const range = {}
  if (isDay(query.dueFrom)) range.$gte = new Date(`${query.dueFrom}T00:00:00.000Z`)
  if (isDay(query.dueTo))   range.$lte = new Date(`${query.dueTo}T23:59:59.999Z`)
  if (Object.keys(range).length) conditions.push({ dueDate: range })

  if (conditions.length) filter.$and = conditions
  return filter
}

module.exports = model('Task', taskSchema)
