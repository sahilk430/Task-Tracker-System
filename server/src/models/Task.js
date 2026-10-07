const { Schema, model } = require('mongoose')
const { TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES } = require('../config/constants')
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

// Query string → Mongo filter (empty params are ignored)
taskSchema.statics.filterFromQuery = function (query) {
  const filter = {}
  for (const [param, field] of Object.entries(QUERY_FILTERS)) {
    if (query[param]) filter[field] = query[param]
  }
  return filter
}

module.exports = model('Task', taskSchema)
