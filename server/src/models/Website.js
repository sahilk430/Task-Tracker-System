const { Schema, model } = require('mongoose')
const { WEBSITE_STATUSES } = require('../config/constants')
const { schemaOptions, ref } = require('./schemaOptions')

const memberSchema = new Schema({
  user:       ref('User', { required: true }),
  assignedAt: { type: Date, default: Date.now },
}, { _id: false })

const websiteSchema = new Schema({
  name:          { type: String, required: true, trim: true },
  domain:        { type: String, required: true, trim: true },
  cmsPlatform:   String,
  industry:      String,
  ga4PropertyId: String,
  gscProperty:   String,
  clientName:    String,
  clientEmail:   String,
  status:        { type: String, enum: WEBSITE_STATUSES, default: 'active' },
  notes:         String,
  creator:       ref('User', { required: true }),
  members:       [memberSchema],
}, schemaOptions)

websiteSchema.index({ 'members.user': 1 })

module.exports = model('Website', websiteSchema)
