const { Schema, model } = require('mongoose')
const { schemaOptions, ref } = require('./schemaOptions')

// File metadata; the bytes live in the `attachments` GridFS bucket (utils/attachments.js)
const attachmentSchema = new Schema({
  task:        ref('Task', { required: true }),
  user:        ref('User', { required: true }),
  filename:    { type: String, required: true },
  contentType: { type: String, required: true },
  size:        { type: Number, required: true },
  fileId:      { type: Schema.Types.ObjectId, required: true },
}, { ...schemaOptions, timestamps: { createdAt: true, updatedAt: false } })

attachmentSchema.index({ task: 1, createdAt: -1 })

module.exports = model('Attachment', attachmentSchema)
