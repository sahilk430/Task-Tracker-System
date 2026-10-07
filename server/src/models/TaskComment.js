const { Schema, model } = require('mongoose')
const { schemaOptions, ref } = require('./schemaOptions')

const taskCommentSchema = new Schema({
  task:     ref('Task', { required: true }),
  user:     ref('User', { required: true }),
  body:     { type: String, required: true, trim: true },
  isEdited: { type: Boolean, default: false },
}, schemaOptions)

// Comments are always listed per task, oldest first
taskCommentSchema.index({ task: 1, createdAt: 1 })

module.exports = model('TaskComment', taskCommentSchema)
