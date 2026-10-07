const { Schema, model } = require('mongoose')
const { PROJECT_STATUSES } = require('../config/constants')
const { schemaOptions, ref } = require('./schemaOptions')

const projectSchema = new Schema({
  website:   ref('Website', { required: true, index: true }),
  name:      { type: String, required: true, trim: true },
  goal:      String,
  startDate: Date,
  endDate:   Date,
  status:    { type: String, enum: PROJECT_STATUSES, default: 'active' },
  creator:   ref('User', { required: true }),
}, schemaOptions)

module.exports = model('Project', projectSchema)
