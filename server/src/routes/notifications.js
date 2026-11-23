const express = require('express')
const { isValidObjectId } = require('mongoose')
const { Notification } = require('../models')
const { authenticate } = require('../middleware/auth')
const { orNotFound } = require('../utils/httpError')

const router = express.Router()
const LIMIT = 30

// GET /api/notifications — newest first, plus the unread count (own notifications only)
router.get('/', authenticate, async (req, res) => {
  const mine = { user: req.user.id }
  const [notifications, unread] = await Promise.all([
    Notification.find(mine).sort({ createdAt: -1 }).limit(LIMIT)
      .populate('actor', 'name').populate('task', 'title'),
    Notification.countDocuments({ ...mine, read: false }),
  ])
  res.json({ notifications, unread })
})

// POST /api/notifications/read-all
router.post('/read-all', authenticate, async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true })
  res.json({ unread: 0 })
})

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  const id = isValidObjectId(req.params.id) ? req.params.id : null
  orNotFound(await Notification.findOneAndUpdate({ _id: id, user: req.user.id }, { read: true }), 'Notification')
  res.json({ unread: await Notification.countDocuments({ user: req.user.id, read: false }) })
})

module.exports = router
