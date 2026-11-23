const { Schema, model } = require('mongoose')
const { NOTIFICATION_TYPES } = require('../config/constants')
const { schemaOptions, ref } = require('./schemaOptions')

const NOTIFICATION_TTL_DAYS = 90

// One in-app notification for one user
const notificationSchema = new Schema({
  user:  ref('User', { required: true }),
  type:  { type: String, enum: NOTIFICATION_TYPES, required: true },
  title: { type: String, required: true },
  body:  String,
  task:  ref('Task', { default: null }),
  actor: ref('User', { default: null }),
  read:  { type: Boolean, default: false },
  // Dedupe key for scheduled reminders, e.g. `overdue:<task>:<due day>` — unique when present
  key:   { type: String, default: undefined },
}, { ...schemaOptions, timestamps: { createdAt: true, updatedAt: false } })

notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, read: 1 })
notificationSchema.index({ key: 1 }, { unique: true, partialFilterExpression: { key: { $type: 'string' } } })
// Old notifications are removed automatically
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: NOTIFICATION_TTL_DAYS * 24 * 60 * 60 })

module.exports = model('Notification', notificationSchema)
