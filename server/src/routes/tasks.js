const express = require('express')
const multer = require('multer')
const { isValidObjectId } = require('mongoose')
const { body } = require('express-validator')
const { Task, TaskComment, TaskActivity, User, Attachment, Notification } = require('../models')
const { authenticate } = require('../middleware/auth')
const { requireRoles, isAdmin, canManageAll, canAccessTask } = require('../middleware/roleCheck')
const { validate } = require('../middleware/validate')
const {
  ADMIN_ROLES, MANAGEMENT_ROLES, CHECKLIST_MAX_ITEMS,
  ATTACHMENT_MAX_BYTES, ATTACHMENTS_PER_TASK, ATTACHMENT_ALLOWED_TYPES,
} = require('../config/constants')
const { HttpError, orNotFound } = require('../utils/httpError')
const { containsRegex } = require('../utils/parse')
const { withCounts } = require('../utils/countBy')
const { notify } = require('../utils/notify')
const { storeFile, openFile, removeFiles } = require('../utils/attachments')

const router = express.Router()

const POPULATE = [
  { path: 'website',  select: 'name domain' },
  { path: 'project',  select: 'name' },
  { path: 'assignee', select: 'name email role avatarUrl' },
  { path: 'creator',  select: 'name' },
]
const COUNTS = { comments: [TaskComment, 'task'], attachments: [Attachment, 'task'] }
const COMMENT_POPULATE = [
  { path: 'user',     select: 'name role avatarUrl' },
  { path: 'mentions', select: 'name' },
]

// Populated JSON with `_count`, as returned by every task endpoint
const present = async (task) => (await withCounts([await task.populate(POPULATE)], COUNTS))[0]

const logActivity = (taskId, userId, entry) =>
  TaskActivity.create({ task: taskId, user: userId, ...entry })

// Loads a task the current user may see, or throws 404 / 403
async function findAccessibleTask(id, user, projection) {
  const task = orNotFound(await Task.findById(id).select(projection), 'Task')
  if (!canAccessTask(user, task)) throw new HttpError(403, 'Access denied.')
  return task
}

const STATUS_TEXT = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done', cancelled: 'Cancelled' }

// Everyone who can open a task: its assignee plus every active manager
async function taskParticipants(task) {
  return User.find({
    isActive: true,
    $or: [{ _id: task.assignee }, { role: { $in: MANAGEMENT_ROLES } }],
  }).select('name role avatarUrl').sort({ name: 1 })
}

// GET /api/tasks
router.get('/', authenticate, async (req, res) => {
  const filter = Task.filterFromQuery(req.query)
  if (typeof req.query.search === 'string' && req.query.search) filter.title = containsRegex(req.query.search)
  // Team members only see tasks assigned to them; `mine=true` narrows managers the same way
  if (!canManageAll(req.user) || req.query.mine === 'true') filter.assignee = req.user.id

  const tasks = await Task.find(filter).populate(POPULATE).sort({ createdAt: -1 })
  res.json({ tasks: await withCounts(tasks, COUNTS) })
})

// GET /api/tasks/:id
router.get('/:id', authenticate, async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user)
  res.json({ task: await present(task) })
})

// POST /api/tasks
router.post('/', authenticate, requireRoles(...MANAGEMENT_ROLES),
  validate([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('websiteId').notEmpty().withMessage('websiteId is required'),
    body('category').notEmpty().withMessage('category is required'),
    body('assignedTo').notEmpty().withMessage('assignedTo is required'),
  ]),
  async (req, res) => {
    const task = await Task.create({
      ...Task.fieldsFromBody(req.body, { canManage: true }),
      creator: req.user.id,
    })
    await logActivity(task._id, req.user.id, { action: 'created', fieldName: 'assignedTo', newValue: String(task.assignee) })
    await notify([{
      user: task.assignee, actor: req.user.id, task: task._id, type: 'assigned', email: true,
      title: `${req.user.name} assigned you a task: ${task.title}`,
      body: task.dueDate ? `Due ${task.dueDate.toISOString().slice(0, 10)}.` : undefined,
    }])
    res.status(201).json({ task: await present(task), message: 'Task created successfully.' })
  }
)

// PUT /api/tasks/:id
router.put('/:id', authenticate, async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user)
  const canManage = canManageAll(req.user)

  // Remember tracked values so changes can be written to the audit log
  const tracked = [
    { fieldName: 'status',     path: 'status',   action: 'status_changed' },
    { fieldName: 'priority',   path: 'priority', action: 'priority_changed' },
    { fieldName: 'assignedTo', path: 'assignee', action: 'reassigned' },
  ].map((t) => ({ ...t, oldValue: String(task.get(t.path)) }))

  task.set(Task.fieldsFromBody(req.body, { canManage }))
  await task.save()

  const changed = tracked.filter((t) => String(task.get(t.path)) !== t.oldValue)
  await Promise.all(changed.map(({ fieldName, path, action, oldValue }) =>
    logActivity(task._id, req.user.id, { action, fieldName, oldValue, newValue: String(task.get(path)) })
  ))

  const did = (field) => changed.some((t) => t.fieldName === field)
  const entries = []
  if (did('assignedTo')) {
    entries.push({
      user: task.assignee, actor: req.user.id, task: task._id, type: 'assigned', email: true,
      title: `${req.user.name} assigned you a task: ${task.title}`,
    })
  }
  if (did('status')) {
    const title = `${req.user.name} moved "${task.title}" to ${STATUS_TEXT[task.status] || task.status}`
    for (const user of [task.assignee, task.creator]) {
      entries.push({ user, actor: req.user.id, task: task._id, type: 'status', title })
    }
  }
  await notify(entries)

  res.json({ task: await present(task), message: 'Task updated successfully.' })
})

// DELETE /api/tasks/:id — also removes its comments and activity
router.delete('/:id', authenticate, requireRoles(...ADMIN_ROLES), async (req, res) => {
  const task = orNotFound(await Task.findById(req.params.id), 'Task')
  const files = await Attachment.find({ task: task._id }).select('fileId').lean()
  await Promise.all([
    TaskComment.deleteMany({ task: task._id }),
    TaskActivity.deleteMany({ task: task._id }),
    Notification.deleteMany({ task: task._id }),
    Attachment.deleteMany({ task: task._id }),
    removeFiles(files.map((f) => f.fileId)),
  ])
  await task.deleteOne()
  res.json({ message: 'Task deleted successfully.' })
})

// GET /api/tasks/:id/comments
router.get('/:id/comments', authenticate, async (req, res) => {
  await findAccessibleTask(req.params.id, req.user, 'assignee')
  const comments = await TaskComment.find({ task: req.params.id })
    .populate(COMMENT_POPULATE)
    .sort({ createdAt: 1 })
  res.json({ comments })
})

// POST /api/tasks/:id/comments
router.post('/:id/comments', authenticate,
  validate([
    body('body').isString().trim().notEmpty().withMessage('Comment cannot be empty.')
      .isLength({ max: 5000 }).withMessage('Comment is too long (max 5000 characters).'),
    body('mentions').optional().isArray({ max: 20 }).withMessage('Invalid mentions.'),
  ]),
  async (req, res) => {
    const task = await findAccessibleTask(req.params.id, req.user, 'title assignee creator')

    // Only people who can open the task can be mentioned
    const requested = (req.body.mentions || []).map(String).filter(isValidObjectId)
    const allowed   = new Set((await taskParticipants(task)).map((u) => u.id))
    const mentions  = [...new Set(requested)].filter((id) => allowed.has(id) && id !== req.user.id)

    const comment = await TaskComment.create({ task: task._id, user: req.user.id, body: req.body.body, mentions })
    await Promise.all([
      comment.populate(COMMENT_POPULATE),
      logActivity(task._id, req.user.id, { action: 'commented' }),
    ])

    const preview   = comment.body.length > 140 ? `${comment.body.slice(0, 140)}…` : comment.body
    const mentioned = new Set(mentions)
    await notify([
      ...mentions.map((user) => ({
        user, actor: req.user.id, task: task._id, type: 'mention', email: true,
        title: `${req.user.name} mentioned you on "${task.title}"`, body: preview,
      })),
      ...[task.assignee, task.creator].filter((u) => !mentioned.has(String(u))).map((user) => ({
        user, actor: req.user.id, task: task._id, type: 'comment',
        title: `${req.user.name} commented on "${task.title}"`, body: preview,
      })),
    ])
    res.status(201).json({ comment })
  }
)

// GET /api/tasks/:id/participants — who can be @mentioned on this task
router.get('/:id/participants', authenticate, async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user, 'assignee')
  res.json({ users: await taskParticipants(task) })
})

// DELETE /api/tasks/:id/comments/:commentId
router.delete('/:id/comments/:commentId', authenticate, async (req, res) => {
  const comment = orNotFound(await TaskComment.findOne({ _id: req.params.commentId, task: req.params.id }), 'Comment')
  if (!isAdmin(req.user) && comment.user.toString() !== req.user.id) {
    throw new HttpError(403, 'Access denied.')
  }
  await comment.deleteOne()
  res.json({ message: 'Comment deleted.' })
})

// GET /api/tasks/:id/activity
router.get('/:id/activity', authenticate, async (req, res) => {
  await findAccessibleTask(req.params.id, req.user, 'assignee')
  const activity = await TaskActivity.find({ task: req.params.id })
    .populate('user', 'name')
    .sort({ createdAt: -1 })
  res.json({ activity })
})

// ── Checklist (sub-steps) ───────────────────────────────────────────
// Anyone who can open the task may add, tick and remove its steps.
const checklistText = () => body('text').isString().trim().notEmpty().withMessage('Step text is required.')
  .isLength({ max: 200 }).withMessage('Step text is too long (max 200 characters).')

const findStep = (task, itemId) => orNotFound(isValidObjectId(itemId) ? task.checklist.id(itemId) : null, 'Step')

// POST /api/tasks/:id/checklist — { text }
router.post('/:id/checklist', authenticate, validate([checklistText()]), async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user)
  if (task.checklist.length >= CHECKLIST_MAX_ITEMS) {
    throw new HttpError(400, `A task can have at most ${CHECKLIST_MAX_ITEMS} steps.`)
  }
  task.checklist.push({ text: req.body.text })
  await task.save()
  res.status(201).json({ checklist: task.checklist })
})

// PATCH /api/tasks/:id/checklist/:itemId — { done?, text? }
router.patch('/:id/checklist/:itemId', authenticate,
  validate([
    checklistText().optional(),
    body('done').optional().isBoolean({ strict: true }).withMessage('done must be true or false.'),
  ]),
  async (req, res) => {
    const task = await findAccessibleTask(req.params.id, req.user)
    const item = findStep(task, req.params.itemId)
    if (req.body.text !== undefined) item.text = req.body.text
    if (req.body.done !== undefined && req.body.done !== item.done) {
      item.done   = req.body.done
      item.doneAt = item.done ? new Date() : null
      item.doneBy = item.done ? req.user.id : null
    }
    await task.save()
    res.json({ checklist: task.checklist })
  }
)

// DELETE /api/tasks/:id/checklist/:itemId
router.delete('/:id/checklist/:itemId', authenticate, async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user)
  findStep(task, req.params.itemId).deleteOne()
  await task.save()
  res.json({ checklist: task.checklist })
})

// ── Attachments ─────────────────────────────────────────────────────
// Stored in MongoDB GridFS. Anyone who can open the task may upload and download;
// the uploader or an admin may delete.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 },
})

// Browsers often send Office / CSV files with a generic type — fall back to the extension
const TYPE_BY_EXTENSION = {
  csv: 'text/csv', txt: 'text/plain', pdf: 'application/pdf', zip: 'application/zip',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}
const resolveType = (file) => {
  if (ATTACHMENT_ALLOWED_TYPES.includes(file.mimetype)) return file.mimetype
  return TYPE_BY_EXTENSION[file.originalname.split('.').pop()?.toLowerCase()] || null
}
// Filenames are shown in the UI and sent back in a header — keep them plain
const cleanName = (name) => name.replace(/[\u0000-\u001f\u007f"\\/]/g, '_').trim().slice(0, 200) || 'file'

const findAttachment = async (taskId, attachmentId) => orNotFound(
  isValidObjectId(attachmentId) ? await Attachment.findOne({ _id: attachmentId, task: taskId }) : null,
  'Attachment'
)

// GET /api/tasks/:id/attachments
router.get('/:id/attachments', authenticate, async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user, 'assignee')
  const attachments = await Attachment.find({ task: task._id }).populate('user', 'name').sort({ createdAt: -1 })
  res.json({ attachments })
})

// POST /api/tasks/:id/attachments — multipart/form-data, field "file"
router.post('/:id/attachments', authenticate, upload.single('file'), async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user, 'title assignee')
  if (!req.file) throw new HttpError(400, 'Choose a file to upload.')
  const contentType = resolveType(req.file)
  if (!contentType) throw new HttpError(415, 'This file type is not allowed. Use images, PDF, Office, CSV, TXT or ZIP files.')
  if (await Attachment.countDocuments({ task: task._id }) >= ATTACHMENTS_PER_TASK) {
    throw new HttpError(400, `A task can have at most ${ATTACHMENTS_PER_TASK} attachments.`)
  }

  // multer decodes the multipart filename as latin1 — restore UTF-8 names
  const filename = cleanName(Buffer.from(req.file.originalname, 'latin1').toString('utf8'))
  const fileId = await storeFile(req.file.buffer, filename, contentType)
  const attachment = await Attachment.create({
    task: task._id, user: req.user.id, filename, contentType, size: req.file.size, fileId,
  })
  await Promise.all([
    attachment.populate('user', 'name'),
    logActivity(task._id, req.user.id, { action: 'attached', newValue: filename }),
  ])
  res.status(201).json({ attachment })
})

// GET /api/tasks/:id/attachments/:attachmentId/download
router.get('/:id/attachments/:attachmentId/download', authenticate, async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user, 'assignee')
  const attachment = await findAttachment(task._id, req.params.attachmentId)
  res.set({
    'Content-Type': attachment.contentType,
    'Content-Length': attachment.size,
    // Always a download — never rendered by the browser on the app's origin
    'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
    'Cache-Control': 'private, no-store',
  })
  openFile(attachment.fileId)
    .on('error', (err) => {
      console.error('Attachment download failed:', err.message)
      if (res.headersSent) res.destroy()
      else res.status(500).json({ message: 'Server error.' })
    })
    .pipe(res)
})

// DELETE /api/tasks/:id/attachments/:attachmentId
router.delete('/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  const task = await findAccessibleTask(req.params.id, req.user, 'assignee')
  const attachment = await findAttachment(task._id, req.params.attachmentId)
  if (!isAdmin(req.user) && String(attachment.user) !== req.user.id) throw new HttpError(403, 'Access denied.')
  await removeFiles([attachment.fileId])
  await attachment.deleteOne()
  res.json({ message: 'Attachment deleted.' })
})

module.exports = router
