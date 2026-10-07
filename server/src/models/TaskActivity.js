const { Schema, model } = require('mongoose')
const { schemaOptions, ref } = require('./schemaOptions')

// Audit log entry: status_changed | priority_changed | reassigned | commented
const taskActivitySchema = new Schema({
  task:      ref('Task', { required: true }),
  user:      ref('User', { required: true }),
  action:    { type: String, required: true },
  fieldName: String,
  oldValue:  String,
  newValue:  String,
}, { ...schemaOptions, timestamps: { createdAt: true, updatedAt: false } })

// Per-task history and the dashboard's "recent activity" feed, newest first
taskActivitySchema.index({ task: 1, createdAt: -1 })
taskActivitySchema.index({ createdAt: -1 })

module.exports = model('TaskActivity', taskActivitySchema)
